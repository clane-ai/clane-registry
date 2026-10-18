#!/usr/bin/env node
/**
 * Validate this registry the way the Clane server will read it (spec §3, §5.1).
 *
 *   node scripts/validate.mjs [--previous latest|none|<file>|<url>]
 *
 * Every item is parsed by the server's own walker (scripts/lib/core.mjs), so "passes CI"
 * and "installs in Clane" cannot disagree. On top of that it enforces the repo rules the
 * walker does not: layout, Agent Skills limits, dependency closure, sizes, no raw HTML
 * in Markdown, workflow sidecars matching workflow.json, and a version bump for every
 * item whose files changed since the previous signed release.
 */
import { readFileSync } from 'node:fs';

import {
  ROOT,
  LATEST_INDEX_URL,
  catalogueOf,
  fetchBytes,
  indexSignatureProblem,
  loadTree,
  parseArgs,
  serverNames,
  externalSkills,
} from './lib/repo.mjs';

/** @typedef {import('./lib/repo.mjs').RepoFile} RepoFile */
/** @typedef {import('./lib/repo.mjs').RegistryIndex} RegistryIndex */

const KIND_DIRS = new Set(['skills', 'roles', 'workflows', 'connectors']);
const TOP_LEVEL = new Set([
  'README.md',
  'LICENSE',
  'registry.yaml',
  'package.json',
  'package-lock.json',
  '.gitattributes',
  '.gitignore',
  '.github',
  '.claude-plugin',
  'docs',
  'scripts',
  'plugins',
  ...KIND_DIRS,
]);
const MB = 1024 * 1024;
const MAX_FILE_BYTES = 16 * MB;
const MAX_BINARY_BYTES = 5 * MB;
const MAX_TOTAL_BYTES = 256 * MB;
const MAX_FILES = 10000;
const DESCRIPTION_MAX = 1024;
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const TEXT_EXT_RE = /\.(md|markdown|txt|ya?ml|json|toml|ini|csv|tsv|html?|xml|svg|xsd|jsx?|tsx?|mjs|cjs|py|rb|go|rs|java|css|scss|less|sh|bash|sql|graphql|proto|conf|cfg)$/i;
const HTML_ELEMENTS = [
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'base', 'blockquote', 'body', 'br',
  'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'dd', 'del',
  'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption',
  'figure', 'font', 'footer', 'form', 'frame', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head',
  'header', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li',
  'link', 'main', 'mark', 'meta', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'p',
  'picture', 'pre', 'q', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span',
  'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template',
  'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'u', 'ul', 'video', 'wbr',
];
const HTML_RE = new RegExp(`<!--|<\\/?(?:${HTML_ELEMENTS.join('|')})(?:\\s[^<>]*)?\\/?>`, 'i');
const SIDECAR_DIRS = { steps: 'code', prompts: 'prompt' };
/** Model prompts, not rendered documents: HTML in them is instruction text. */
const PROMPT_FILE_RE = /^(roles\/[^/]+\/system_prompt\.md|(?:workflows|plugins\/[^/]+\/skills\/.+\/examples)\/[^/]+\/prompts\/[^/]+\.md)$/;
/** Claude Code plugin skills (plugins/<name>/skills/<skill>/SKILL.md) live outside the Clane catalogue. */
const PLUGIN_SKILL_RE = /^plugins\/[^/]+\/skills\/[^/]+\/SKILL\.md$/;
/** A skill's requires_tools is documentation; the install plan resolves tools for roles and workflows only. */
const TOOL_CHECKED_KINDS = new Set(['role', 'workflow']);

/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/** @param {string} v */
function semver(v) {
  const m = SEMVER_RE.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** @param {number[]} a @param {number[]} b */
function semverGreater(a, b) {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/** @param {RepoFile[]} files @param {string[]} symlinks */
function checkLayout(files, symlinks) {
  for (const link of symlinks) fail(`${link}: symlinks are not allowed`);
  if (files.length > MAX_FILES) fail(`repo has ${files.length} files; Clane reads at most ${MAX_FILES}`);
  let total = 0;
  for (const { rel, bytes } of files) {
    total += bytes.length;
    const segments = rel.split('/');
    const top = segments[0];
    if (!TOP_LEVEL.has(top)) fail(`${rel}: unexpected top-level entry "${top}"`);
    if (rel === 'SKILL.md') fail('SKILL.md at the repo root hides every skill from the skills CLI');
    if (segments.at(-1) === 'SKILL.md' && top !== 'skills' && !PLUGIN_SKILL_RE.test(rel)) fail(`${rel}: SKILL.md is only allowed under skills/`);
    if (bytes.length > MAX_FILE_BYTES) fail(`${rel}: larger than 16 MB`);
    else if (bytes.length > MAX_BINARY_BYTES && !TEXT_EXT_RE.test(rel)) fail(`${rel}: binary larger than 5 MB`);
    if (!KIND_DIRS.has(top)) continue;
    if (segments.length < 3) fail(`${rel}: files directly under ${top}/ are ignored; put them in an item folder`);
    else if (segments.slice(1).some((s) => s.startsWith('.'))) fail(`${rel}: hidden files are dropped by Clane`);
  }
  if (total > MAX_TOTAL_BYTES) fail(`repo unpacks to ${Math.round(total / MB)} MB; Clane reads at most 256 MB`);
}

/** @param {RepoFile[]} files */
function checkMarkdown(files) {
  for (const { rel, bytes } of files) {
    if (!/\.(md|markdown)$/i.test(rel) || PROMPT_FILE_RE.test(rel) || rel.startsWith('.github/')) continue;
    let fenced = false;
    bytes
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (/^\s*(```|~~~)/.test(line)) {
          fenced = !fenced;
          return;
        }
        if (fenced) return;
        const prose = line.replace(/`[^`]*`/g, '');
        if (HTML_RE.test(prose)) fail(`${rel}:${i + 1}: raw HTML in Markdown (use Markdown, or put it in a code span)`);
      });
  }
}

/**
 * @param {Awaited<ReturnType<typeof catalogueOf>>} catalogue
 * @param {Map<string, RepoFile>} byRel
 */
function checkItems(catalogue, byRel) {
  const { coreSkills, builtinTools } = serverNames();
  const tools = new Set(builtinTools);
  const has = { skill: new Set(), role: new Set(), workflow: new Set(), connector: new Set() };
  const presets = new Set();
  for (const item of catalogue.items) {
    has[item.kind].add(item.slug);
    if (item.kind === 'connector' && item.manifest.preset) presets.add(String(item.manifest.preset));
  }
  const external = externalSkills();
  for (const [slug, source] of external) {
    if (has.skill.has(slug)) fail(`skills/${slug}: must not be in this repo (licence forbids redistribution; it comes from ${source})`);
  }
  for (const core of coreSkills) {
    if (has.skill.has(core)) continue;
    if (external.has(core)) warn(`core skill "${core}" comes from ${external.get(core)}, not from this repo`);
    else fail(`core skill "${core}" (CORE_SKILL_NAMES) is missing from skills/`);
  }
  for (const item of catalogue.items) {
    const where = item.path;
    if (!semver(item.version)) fail(`${where}: version "${item.version}" is not x.y.z semver`);
    const description = String(item.manifest.description ?? '');
    if (!description.trim()) fail(`${where}: description is empty`);
    if (description.length > DESCRIPTION_MAX) fail(`${where}: description is ${description.length} chars (max ${DESCRIPTION_MAX})`);
    for (const slug of item.requires.skills) {
      if (has.skill.has(slug) || (external.has(slug) && coreSkills.includes(slug))) continue;
      if (external.has(slug)) warn(`${where}: needs skill "${slug}", which comes from ${external.get(slug)}`);
      else fail(`${where}: needs skill "${slug}", which is not in skills/`);
    }
    for (const slug of item.requires.roles) if (!has.role.has(slug)) fail(`${where}: needs role "${slug}", which is not in roles/`);
    const checkTools = TOOL_CHECKED_KINDS.has(item.kind);
    for (const tool of item.requires.tools) if (checkTools && !tools.has(tool)) fail(`${where}: needs tool "${tool}", which the Clane server does not provide`);
    for (const name of item.requires.connectors) {
      if (!has.connector.has(name) && !presets.has(name)) warn(`${where}: uses connector "${name}", which has no entry in connectors/ (listed as "connect after install")`);
    }
    if (item.kind === 'connector') checkConnector(item);
    if (item.kind === 'workflow') checkWorkflowSidecars(item, byRel);
  }
}

/** @param {{ path: string, manifest: Record<string, unknown> }} item */
function checkConnector(item) {
  const m = item.manifest;
  if (m.transport === 'stdio') fail(`${item.path}: stdio connectors are refused by the Clane server`);
  if (typeof m.url === 'string' && !m.url.startsWith('https://')) fail(`${item.path}: connector url must be https`);
}

/**
 * steps/<node-id>.<ext> and prompts/<node-id>.md must equal the node's code / prompt.
 * @param {{ path: string, files: string[], manifest: Record<string, unknown> }} item
 * @param {Map<string, RepoFile>} byRel
 * @param {boolean} [byContent] a file named for no node still passes when some node's field equals it (plugin workflows)
 */
function checkWorkflowSidecars(item, byRel, byContent = false) {
  const definition = /** @type {{ nodes: Array<{ id: string, data: { config: Record<string, unknown> } }> }} */ (
    item.manifest.definition
  );
  const nodes = new Map(definition.nodes.map((n) => [n.id, n]));
  for (const rel of item.files) {
    const [dir, file] = rel.split('/');
    const field = SIDECAR_DIRS[dir];
    if (!field || !file || rel.split('/').length !== 2) continue;
    const id = file.replace(/\.[^.]+$/, '');
    const text = byRel.get(`${item.path}/${rel}`).bytes.toString('utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
    const node = nodes.get(id) ?? (byContent ? [...nodes.values()].find((n) => n.data.config[field] === text) : undefined);
    if (!node) {
      fail(`${item.path}/${rel}: no node "${id}" in workflow.json`);
      continue;
    }
    if (node.data.config[field] !== text) fail(`${item.path}/${rel}: differs from node "${id}" ${field} in workflow.json`);
  }
}

/**
 * Workflows shipped inside a plugin (plugins/<name>/clane/workflows/<slug>/, or a skill's
 * worked examples under plugins/<name>/skills/<skill>/.../examples/<slug>/) are not in the
 * catalogue; their steps/ and prompts/ copies must still equal the inlined workflow.json.
 * @param {RepoFile[]} files
 * @param {Map<string, RepoFile>} byRel
 */
function checkPluginWorkflows(files, byRel) {
  const roots = files
    .map((f) => /^(plugins\/[^/]+\/(?:clane\/workflows|skills\/.+\/examples)\/[^/]+)\/workflow\.json$/.exec(f.rel))
    .filter(Boolean)
    .map((m) => m[1]);
  for (const path of roots) {
    let manifest;
    try {
      manifest = JSON.parse(byRel.get(`${path}/workflow.json`).bytes.toString('utf8'));
    } catch (err) {
      fail(`${path}/workflow.json: not valid JSON (${err.message})`);
      continue;
    }
    if (!Array.isArray(manifest?.definition?.nodes)) {
      fail(`${path}/workflow.json: definition.nodes is missing`);
      continue;
    }
    const prefix = `${path}/`;
    const own = files.filter((f) => f.rel.startsWith(prefix)).map((f) => f.rel.slice(prefix.length));
    checkWorkflowSidecars({ path, files: own, manifest }, byRel, true);
  }
}

/** @param {string} spec @returns {Promise<RegistryIndex | null>} */
async function loadPrevious(spec) {
  if (spec === 'none') return null;
  if (spec === 'latest' || /^https:\/\//.test(spec)) {
    const bytes = await fetchBytes(spec === 'latest' ? LATEST_INDEX_URL : spec, { allow404: true });
    if (!bytes) return null;
    return JSON.parse(bytes.toString('utf8'));
  }
  return JSON.parse(readFileSync(spec, 'utf8'));
}

/**
 * @param {Awaited<ReturnType<typeof catalogueOf>>} catalogue
 * @param {RegistryIndex} previous
 */
function checkVersionBumps(catalogue, previous) {
  const problem = indexSignatureProblem(previous);
  if (problem) {
    fail(`previous release index: ${problem}`);
    return;
  }
  const before = new Map(previous.items.map((i) => [`${i.kind}:${i.slug}`, i]));
  for (const item of catalogue.items) {
    const old = before.get(`${item.kind}:${item.slug}`);
    if (!old || old.treeSha === item.treeSha) continue;
    const now = semver(item.version);
    const was = semver(old.version);
    if (now && was && !semverGreater(now, was)) {
      fail(`${item.path}: files changed since ${previous.tag} but version ${item.version} is not above ${old.version}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  const previousSpec = typeof args.previous === 'string' ? args.previous : 'latest';
  const { files, symlinks } = loadTree(ROOT);
  const byRel = new Map(files.map((f) => [f.rel, f]));

  checkLayout(files, symlinks);
  checkMarkdown(files);
  const catalogue = await catalogueOf(files);
  for (const broken of catalogue.broken) fail(`${broken.path}: ${broken.error}`);
  checkItems(catalogue, byRel);
  checkPluginWorkflows(files, byRel);

  const previous = await loadPrevious(previousSpec);
  if (previous) checkVersionBumps(catalogue, previous);

  const counts = { skill: 0, role: 0, workflow: 0, connector: 0 };
  for (const item of catalogue.items) counts[item.kind] += 1;
  console.log(
    `items: ${counts.skill} skills, ${counts.role} roles, ${counts.workflow} workflows, ${counts.connector} connectors; ` +
      `${catalogue.broken.length} unreadable; ${files.length} files`,
  );
  console.log(previous ? `version bumps checked against ${previous.tag}` : 'no previous release: version-bump check skipped');
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
  if (errors.length) {
    console.log(`FAILED: ${errors.length} error(s)`);
    process.exit(1);
  }
  console.log('OK');
}

await main();
