#!/usr/bin/env node
/**
 * Verify a published release from its PUBLIC URLs (spec §5.2 step 6). The release is not
 * done until this passes.
 *
 *   node scripts/verify-release.mjs --tag v2026.10.0 --commit <40-hex>
 *
 * Checks, with the same code the Clane server runs:
 *  - index.json downloaded from the release verifies against the embedded public key
 *    (typ pinned to "registry-index") and names this repo, tag and commit;
 *  - registry-<tag>.tar.gz from the release, AND the codeload tarball Clane itself
 *    downloads for that commit, both extract with the server's hardened tar reader and
 *    walk to exactly the indexed items with identical tree digests.
 */
import { extractTarGz } from './lib/core.mjs';
import {
  REPO,
  catalogueOf,
  fetchBytes,
  indexSignatureProblem,
  parseArgs,
  releaseAssetUrl,
} from './lib/repo.mjs';

/** @typedef {import('./lib/repo.mjs').RegistryIndex} RegistryIndex */

const args = parseArgs();
const tag = String(args.tag ?? '');
const commit = String(args.commit ?? '');
if (!tag || !/^[0-9a-f]{40}$/.test(commit)) {
  console.error('usage: node scripts/verify-release.mjs --tag <tag> --commit <40-hex>');
  process.exit(2);
}

/** @type {string[]} */
const errors = [];

/**
 * @param {string} label
 * @param {Buffer} archive
 * @param {RegistryIndex} index
 */
async function compareTree(label, archive, index) {
  const catalogue = await catalogueOf(extractTarGz(archive));
  for (const b of catalogue.broken) errors.push(`${label}: unreadable ${b.path}: ${b.error}`);
  const got = new Map(catalogue.items.map((i) => [`${i.kind}:${i.slug}`, i]));
  for (const want of index.items) {
    const item = got.get(`${want.kind}:${want.slug}`);
    if (!item) errors.push(`${label}: ${want.path} is in the index but not in the archive`);
    else if (item.treeSha !== want.treeSha) errors.push(`${label}: ${want.path} digest ${item.treeSha} != index ${want.treeSha}`);
    else if (item.version !== want.version) errors.push(`${label}: ${want.path} version ${item.version} != index ${want.version}`);
    got.delete(`${want.kind}:${want.slug}`);
  }
  for (const extra of got.values()) errors.push(`${label}: ${extra.path} is in the archive but not in the index`);
  console.log(`${label}: ${catalogue.items.length} items, digests compared against the signed index`);
}

const indexBytes = await fetchBytes(releaseAssetUrl(tag, 'index.json'));
/** @type {RegistryIndex & { kid: string }} */
const index = JSON.parse(indexBytes.toString('utf8'));
const problem = indexSignatureProblem(index);
if (problem) errors.push(`index.json: ${problem}`);
else console.log(`index.json: signature verifies (kid ${index.kid}, typ ${index.typ})`);
if (index.repo !== REPO) errors.push(`index.json names repo ${index.repo}, expected ${REPO}`);
if (index.tag !== tag) errors.push(`index.json names tag ${index.tag}, expected ${tag}`);
if (index.commit !== commit) errors.push(`index.json names commit ${index.commit}, expected ${commit}`);

const releaseTarball = await fetchBytes(releaseAssetUrl(tag, `registry-${tag}.tar.gz`));
await compareTree(`registry-${tag}.tar.gz`, releaseTarball, index);
const codeload = await fetchBytes(`https://codeload.github.com/${REPO}/tar.gz/${commit}`);
await compareTree('codeload tarball', codeload, index);

for (const e of errors) console.log(`error: ${e}`);
if (errors.length) {
  console.log(`FAILED: ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`OK: ${tag} (${commit}) is published and verifies from its public URLs`);
