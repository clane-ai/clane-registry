#!/usr/bin/env node
/**
 * skills.sh / Agent Skills compatibility gate (spec §3.1a, §5.1).
 *
 *   node scripts/compat.mjs [--require-skills-ref]
 *
 * 1. Runs the skills CLI in discovery-only mode (`npx skills add <repo> --list`, nothing
 *    is installed) and asserts it finds exactly the folders under skills/.
 * 2. Runs the Agent Skills reference validator (`agentskills validate`, PyPI package
 *    skills-ref) on every skill. Clane keeps its own manifest fields (version, tags,
 *    requires_tools, ...) at the top level of the frontmatter, which the skills CLI and
 *    Clane both accept but the reference validator reports as "Unexpected fields". That
 *    one finding is tolerated; every other finding fails the gate.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, parseArgs } from './lib/repo.mjs';

const SKILLS_CLI = 'skills@1.7.2';
const TOLERATED = /^Unexpected fields in frontmatter: /;
const ANSI_RE = /\u001b\[[0-9;?]*[A-Za-z]/g;

/** @type {string[]} */
const errors = [];

const skillDirs = readdirSync(join(ROOT, 'skills'))
  .filter((name) => statSync(join(ROOT, 'skills', name)).isDirectory())
  .sort();

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {{ status: number | null, out: string, missing: boolean }}
 */
function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1', CI: '1' },
    maxBuffer: 64 * 1024 * 1024,
  });
  const missing = res.error?.code === 'ENOENT' || /not recognized|not found/.test(res.stderr ?? '');
  return { status: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}`.replace(ANSI_RE, ''), missing };
}

function checkDiscovery() {
  const { status, out } = run('npx', ['-y', SKILLS_CLI, 'add', ROOT, '--list']);
  if (status !== 0) {
    errors.push(`skills CLI exited with ${status}:\n${out.slice(-2000)}`);
    return;
  }
  const lines = out.split(/\r?\n/);
  const start = lines.findIndex((l) => /Available Skills/.test(l));
  const found = lines
    .slice(start + 1)
    .map((l) => /^\S\s{4}([a-z0-9][a-z0-9-]*)\s*$/.exec(l)?.[1])
    .filter((name) => name !== undefined)
    .sort();
  const want = new Set(skillDirs);
  const got = new Set(found);
  const missing = skillDirs.filter((s) => !got.has(s));
  const extra = found.filter((s) => !want.has(s));
  if (start === -1 || missing.length || extra.length || found.length !== skillDirs.length) {
    errors.push(
      `skills CLI discovered ${found.length} skills, skills/ has ${skillDirs.length}` +
        (missing.length ? `; not discovered: ${missing.join(', ')}` : '') +
        (extra.length ? `; unexpected: ${extra.join(', ')}` : ''),
    );
    return;
  }
  console.log(`skills CLI (${SKILLS_CLI}) discovered all ${found.length} skills`);
}

/** @param {boolean} required */
function checkReferenceValidator(required) {
  const probe = run('agentskills', ['--version']);
  if (probe.missing || probe.status !== 0) {
    const msg = 'agentskills (pip install skills-ref) is not installed';
    if (required) errors.push(msg);
    else console.log(`skipped: ${msg}`);
    return;
  }
  let tolerated = 0;
  for (const slug of skillDirs) {
    const { status, out } = run('agentskills', ['validate', join(ROOT, 'skills', slug)]);
    if (status === 0) continue;
    const issues = out
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^- /, ''))
      .filter((l) => l && !l.startsWith('Validation failed for'));
    const real = issues.filter((l) => !TOLERATED.test(l));
    if (real.length) errors.push(`skills/${slug}: ${real.join(' | ')}`);
    else tolerated += 1;
  }
  console.log(
    `agentskills validate: ${skillDirs.length} skills checked; ${tolerated} carry Clane's top-level manifest fields (tolerated)`,
  );
}

const args = parseArgs();
checkDiscovery();
checkReferenceValidator(args['require-skills-ref'] === true);
for (const e of errors) console.log(`error: ${e}`);
if (errors.length) {
  console.log(`FAILED: ${errors.length} error(s)`);
  process.exit(1);
}
console.log('OK');
