import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const { API_VERSION, DIST_TAG, PACKAGE_NAME, PUBLISH_IF_MISSING = 'false' } = process.env;
const metadataPath = 'api-release/extension-api-release.json';
const tarballPath = 'api-release/extension-api.tgz';
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const tarball = readFileSync(tarballPath);
assert.equal(createHash('sha256').update(tarball).digest('hex'), metadata.tarballSha256, 'API tarball checksum must match release metadata');
const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`;
const view = spec => JSON.parse(execFileSync('npm', ['view', spec, '--json', '--registry=https://registry.npmjs.org', '--prefer-online'], { encoding: 'utf8' }));

let existing;
try {
  existing = view(`${PACKAGE_NAME}@${API_VERSION}`);
  assert(existing && typeof existing === 'object', 'Expected npm version metadata');
} catch (error) {
  let code;
  try { code = JSON.parse(String(error.stdout)).error?.code; } catch {}
  if (code !== 'E404') throw error;
}
if (!existing && PUBLISH_IF_MISSING === 'true') {
  execFileSync('npm', ['publish', tarballPath, '--access', 'public', '--tag', DIST_TAG, '--ignore-scripts', '--registry=https://registry.npmjs.org'], { stdio: 'inherit' });
}
if (!existing && PUBLISH_IF_MISSING !== 'true') throw new Error('API version is not available after publication.');

let verified = false;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const version = view(`${PACKAGE_NAME}@${API_VERSION}`);
    const tags = version['dist-tags'];
    metadata.npmVerification = { checkedAt: new Date().toISOString(), version: version.version,
      distTag: DIST_TAG, distTagVersion: tags[DIST_TAG], integrity: version.dist.integrity };
    verified = version.version === API_VERSION && tags[DIST_TAG] === API_VERSION && version.dist.integrity === integrity;
    metadata.npmVerification.verified = verified;
  } catch (error) {
    metadata.npmVerification = { checkedAt: new Date().toISOString(), verified: false, error: error.message };
  }
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
  if (verified) break;
  if (attempt < 5) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000);
}
if (!verified) throw new Error('Post-publish npm verification failed; inspect release metadata');
if (existing) console.log('npm version already matches the verified paired tarball');
