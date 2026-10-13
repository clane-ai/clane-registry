#!/usr/bin/env node
/**
 * Build the unsigned release index (spec §5.2) from the working tree.
 *
 *   node scripts/index.mjs --tag v2026.10.0 --commit <40-hex> --out dist/index.unsigned.json
 *
 * Refuses to build from a tree with unreadable items: an index must never list something
 * Clane cannot install.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { ROOT, buildIndex, catalogueOf, loadTree, parseArgs } from './lib/repo.mjs';

const TAG_RE = /^v\d{4}\.\d{1,2}\.\d+$/;
const SHA_RE = /^[0-9a-f]{40}$/;

const args = parseArgs();
const tag = String(args.tag ?? '');
const commit = String(args.commit ?? '');
const out = String(args.out ?? 'dist/index.unsigned.json');
if (!TAG_RE.test(tag)) throw new Error(`--tag must look like v2026.10.0, got "${tag}"`);
if (!SHA_RE.test(commit)) throw new Error(`--commit must be a 40-hex commit SHA, got "${commit}"`);

const catalogue = await catalogueOf(loadTree(ROOT).files);
if (catalogue.broken.length) {
  for (const b of catalogue.broken) console.error(`unreadable: ${b.path}: ${b.error}`);
  process.exit(1);
}
const index = buildIndex(catalogue, { tag, commit });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(index, null, 2)}\n`);
console.log(`wrote ${out}: ${index.items.length} items at ${commit} (${tag})`);
