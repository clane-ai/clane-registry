#!/usr/bin/env node
/**
 * Sign the release index with the registry-release key (spec §5.2 step 3).
 *
 *   CLANE_REGISTRY_RELEASE_KEY=<pkcs8 base64> node scripts/sign.mjs dist/index.unsigned.json dist/index.json
 *
 * Uses the server's own signDocument (typ "registry-index"), then verifies the result
 * against the PUBLIC key in scripts/lib/keys.json before writing it, so a wrong or
 * rotated secret fails here instead of shipping an index no Clane server accepts.
 * The key is read from the environment only and is never printed or written.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { signDocument } from './lib/core.mjs';
import { INDEX_TYP, indexSignatureProblem, publicKeys } from './lib/repo.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/sign.mjs <index.unsigned.json> <index.json>');
  process.exit(2);
}
const seed = process.env.CLANE_REGISTRY_RELEASE_KEY ?? '';
if (!seed) {
  console.error('CLANE_REGISTRY_RELEASE_KEY is not set');
  process.exit(1);
}

const unsigned = JSON.parse(readFileSync(input, 'utf8'));
let signed;
try {
  signed = signDocument(unsigned, INDEX_TYP, seed);
} catch {
  console.error('CLANE_REGISTRY_RELEASE_KEY is not a valid Ed25519 PKCS#8 key');
  process.exit(1);
}
if (!publicKeys().some((k) => k.kid === signed.kid)) {
  console.error(`the signing key (kid ${signed.kid}) is not the registry-release key in scripts/lib/keys.json`);
  process.exit(1);
}
const problem = indexSignatureProblem(signed);
if (problem) {
  console.error(`signed index does not verify: ${problem}`);
  process.exit(1);
}
writeFileSync(output, `${JSON.stringify(signed, null, 2)}\n`);
console.log(`signed ${output} with kid ${signed.kid}`);
