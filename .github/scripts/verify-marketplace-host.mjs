import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const metadataPath = process.env.METADATA_PATH;
if (!metadataPath) throw new Error('METADATA_PATH is required.');

const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const marketplace = JSON.parse(execFileSync(
  'pnpm',
  ['exec', 'vsce', 'show', 'salesforce.apex-language-server-extension', '--json'],
  { cwd: 'packages/apex-lsp-vscode-extension', encoding: 'utf8' },
));
assert(Array.isArray(marketplace.versions), 'Marketplace response must include versions');
const versions = marketplace.versions.filter(entry => entry.targetPlatform !== 'web' && entry.version === metadata.sourceHostPackageVersion);
assert.equal(versions.length, 1, 'Expected exactly one matching non-web Marketplace host version');
const checksums = (versions[0].properties || []).filter(property => property.key === 'Microsoft.VisualStudio.Services.VsixSha256');
assert.equal(checksums.length, 1, 'Expected Marketplace VSIX SHA256 property');
const sha256 = checksums[0].value;
assert.match(sha256, /^[0-9a-f]{64}$/i, 'Expected valid Marketplace VSIX SHA256');
assert.equal(sha256.toLowerCase(), metadata.hostVsixSha256, 'Marketplace host checksum must match paired VSIX');

if (process.env.RECORD_VERIFICATION === 'true') {
  metadata.hostPublication = { status: 'verified', checkedAt: new Date().toISOString(),
    version: versions[0].version, sha256: sha256.toLowerCase(), immutableIdentityVerified: true };
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}
