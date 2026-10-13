/**
 * Shared helpers for the registry scripts: read the repo tree the way Clane reads a
 * downloaded tarball, load the public key and the server name snapshot, and fetch
 * release assets.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCatalogue, verifyDocument, deriveKid } from './core.mjs';

/** @typedef {{ rel: string, bytes: Buffer }} RepoFile */
/** @typedef {{ files: RepoFile[], symlinks: string[] }} RepoTree */
/** @typedef {{ kid: string, spki: string, status: string, purpose: string }} PublicKey */
/**
 * @typedef {object} IndexItem
 * @property {string} kind
 * @property {string} slug
 * @property {string} version
 * @property {string} path
 * @property {string} title
 * @property {string} description
 * @property {string} treeSha
 * @property {{ skills: string[], roles: string[], connectors: string[], tools: string[], files: object[] }} requires
 * @property {string} publisher
 */
/**
 * @typedef {object} RegistryIndex
 * @property {number} v
 * @property {string} typ
 * @property {string} generated_at
 * @property {string} repo
 * @property {string} tag
 * @property {string} commit
 * @property {IndexItem[]} items
 */

export const REPO = 'clane-ai/clane-registry';
export const REPO_NAME = 'clane-registry';
export const INDEX_TYP = 'registry-index';

const here = fileURLToPath(new URL('.', import.meta.url));
export const ROOT = resolve(here, '..', '..');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** @returns {PublicKey[]} */
export function publicKeys() {
  return readJson(join(here, 'keys.json')).keys;
}

/** @returns {{ coreSkills: string[], builtinTools: string[] }} */
export function serverNames() {
  const data = readJson(join(here, 'server-names.json'));
  return { coreSkills: data.coreSkills, builtinTools: data.builtinTools };
}

/**
 * Skills this repo must not carry, mapped to the source they are installed from.
 * @returns {Map<string, string>}
 */
export function externalSkills() {
  /** @type {Record<string, string[]>} */
  const sources = readJson(join(here, 'external-skills.json')).sources;
  return new Map(Object.entries(sources).flatMap(([source, slugs]) => slugs.map((slug) => [slug, source])));
}

function gitList(root) {
  try {
    const out = execFileSync(
      'git',
      ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { encoding: 'buffer', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return out.toString('utf8').split('\0').filter(Boolean);
  } catch {
    return null;
  }
}

function walkList(root, base = '') {
  const out = [];
  for (const name of readdirSync(join(root, base))) {
    if (name === '.git' || name === 'node_modules') continue;
    const rel = base ? `${base}/${name}` : name;
    const stat = lstatSync(join(root, rel));
    if (stat.isDirectory()) out.push(...walkList(root, rel));
    else out.push(rel);
  }
  return out;
}

/**
 * Every file git would publish (tracked plus untracked-but-not-ignored), as posix
 * paths and raw bytes. Symlinks are reported, never read.
 * @param {string} root
 * @returns {RepoTree}
 */
export function loadTree(root = ROOT) {
  const rels = gitList(root) ?? walkList(root);
  const files = [];
  const symlinks = [];
  for (const rel of rels) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const stat = lstatSync(abs);
    if (stat.isSymbolicLink()) {
      symlinks.push(rel);
      continue;
    }
    if (!stat.isFile()) continue;
    files.push({ rel: rel.replace(/\\/g, '/'), bytes: readFileSync(abs) });
  }
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return { files, symlinks };
}

/** @param {RepoFile[]} files */
export function catalogueOf(files) {
  return buildCatalogue(files, { repoName: REPO_NAME });
}

/**
 * Verify a signed index against the embedded public key, typ pinned.
 * @param {RegistryIndex & { kid?: string }} doc
 * @returns {string | null} the problem, or null when it verifies
 */
export function indexSignatureProblem(doc) {
  const key = publicKeys().find((k) => k.kid === doc.kid);
  if (!key) return `index is signed by unknown key "${doc.kid}"`;
  if (deriveKid(key.spki) !== key.kid) return `keys.json entry ${key.kid} does not match its spki`;
  if (!verifyDocument(doc, INDEX_TYP, key.spki)) return 'index signature does not verify';
  return null;
}

/**
 * GET with a few retries (release assets can take a moment to appear on the CDN).
 * @param {string} url
 * @param {{ attempts?: number, allow404?: boolean }} [opts]
 * @returns {Promise<Buffer | null>} null only for a 404 when allow404 is set
 */
export async function fetchBytes(url, opts = {}) {
  const attempts = opts.attempts ?? 6;
  let last = '';
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'clane-registry-ci' } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 404 && opts.allow404) return null;
    last = `${res.status} ${res.statusText}`;
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`GET ${url} failed: ${last}`);
}

/** @param {string} tag @param {string} asset */
export const releaseAssetUrl = (tag, asset) =>
  `https://github.com/${REPO}/releases/download/${encodeURIComponent(tag)}/${asset}`;

export const LATEST_INDEX_URL = `https://github.com/${REPO}/releases/latest/download/index.json`;

/** Parse `--name value` and `--flag` arguments. */
export function parseArgs(argv = process.argv.slice(2)) {
  /** @type {Record<string, string | true>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[arg.slice(2)] = true;
    else {
      out[arg.slice(2)] = next;
      i += 1;
    }
  }
  return out;
}

/**
 * The unsigned release index (spec §5.2) for a catalogue at a commit.
 * @param {Awaited<ReturnType<typeof catalogueOf>>} catalogue
 * @param {{ tag: string, commit: string, generatedAt?: string }} at
 * @returns {RegistryIndex}
 */
export function buildIndex(catalogue, at) {
  const repoPublisher = catalogue.publisher ?? 'Clane';
  return {
    v: 1,
    typ: INDEX_TYP,
    generated_at: at.generatedAt ?? new Date().toISOString(),
    repo: REPO,
    tag: at.tag,
    commit: at.commit,
    items: catalogue.items.map((item) => ({
      kind: item.kind,
      slug: item.slug,
      version: item.version,
      path: item.path,
      title: item.title,
      description: item.description,
      treeSha: item.treeSha,
      requires: item.requires,
      publisher: item.publisher ?? repoPublisher,
    })),
  };
}
