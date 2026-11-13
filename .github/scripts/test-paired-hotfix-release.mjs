import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const read = path => readFileSync(join(process.cwd(), path), 'utf8');
const workflow = read('.github/workflows/paired-hotfix-release.yml');
const resumeWorkflow = read('.github/workflows/resume-paired-hotfix-api.yml');
const packageWorkflow = read('.github/workflows/package.yml');
const manualPublishWorkflow = read('.github/workflows/manual-publish.yml');
const setupAction = read('.github/actions/setup-pnpm/action.yml');
const marketplaceVerifier = read('.github/scripts/verify-marketplace-host.mjs');
const apiPublisher = read('.github/scripts/publish-paired-api.mjs');

test('paired release uses immutable source and correctly orders publication', () => {
  assert.match(workflow, /source_sha:/);
  assert.match(workflow, /\^\[0-9a-fA-F\]\{40\}\$/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /node \.github\/scripts\/validate-extension-api-release\.mjs/);
  assert.match(workflow, /publish-extension:\n    needs: \[verify-source, package-extension, marketplace-guard, api-version-guard\]/);
  assert.match(workflow, /publish-api:\n    needs: \[verify-source, verify-host-publication\]/);
  assert.match(workflow, /require-approval: 'false'/);
  assert.doesNotMatch(workflow, /^\s*environment:/m);
  assert.match(workflow, /secrets:\n      VSCE_PERSONAL_ACCESS_TOKEN: \$\{\{ secrets\.VSCE_PERSONAL_ACCESS_TOKEN \}\}/);
  assert.doesNotMatch(workflow, /secrets: inherit/);
  assert.match(manualPublishWorkflow, /secrets:\n      VSCE_PERSONAL_ACCESS_TOKEN: \$\{\{ secrets\.VSCE_PERSONAL_ACCESS_TOKEN \}\}/);
  assert.doesNotMatch(manualPublishWorkflow, /secrets: inherit/);
});

test('both workflows use the shared release components', () => {
  for (const source of [workflow, resumeWorkflow]) {
    assert.match(source, /node \.github\/scripts\/verify-marketplace-host\.mjs/);
    assert.match(source, /node \.github\/scripts\/publish-paired-api\.mjs/);
  }
  assert.equal((workflow.match(/uses: \.\/\.github\/actions\/setup-pnpm/g) || []).length, 2);
  assert.match(resumeWorkflow, /uses: \.\/\.github\/actions\/setup-pnpm/);
  assert.doesNotMatch(workflow, /paired-marketplace-guard-/);
});

test('shared setup action installs dependencies after the workflow checks out an immutable source', () => {
  for (const source of [workflow, resumeWorkflow]) {
    assert.match(source, /actions\/checkout@v6/);
    assert.match(source, /persist-credentials: false/);
  }
  assert.doesNotMatch(setupAction, /actions\/checkout/);
  assert.match(setupAction, /corepack enable/);
  assert.match(setupAction, /actions\/setup-node@v6/);
  assert.match(setupAction, /pnpm install --frozen-lockfile/);
});

test('Marketplace verifier validates the exact host version and checksum', () => {
  assert.match(marketplaceVerifier, /Marketplace response must include versions/);
  assert.match(marketplaceVerifier, /targetPlatform !== 'web'/);
  assert.match(marketplaceVerifier, /Expected exactly one matching non-web Marketplace host version/);
  assert.match(marketplaceVerifier, /Microsoft\.VisualStudio\.Services\.VsixSha256/);
  assert.match(marketplaceVerifier, /Marketplace host checksum must match paired VSIX/);
  assert.match(marketplaceVerifier, /RECORD_VERIFICATION === 'true'/);
});

test('API publisher verifies tarball integrity and registry publication', () => {
  assert.match(apiPublisher, /API tarball checksum must match release metadata/);
  assert.match(apiPublisher, /PUBLISH_IF_MISSING === 'true'/);
  assert.match(apiPublisher, /npm', \['publish'/);
  assert.match(apiPublisher, /for \(let attempt = 0; attempt < 6; attempt\+\+\)/);
  assert.match(apiPublisher, /version\['dist-tags'\]/);
  assert.match(apiPublisher, /Post-publish npm verification failed/);
});

test('API registry guard fails closed', () => {
  const job = workflow.split('  api-version-guard:')[1].split('  publish-extension:')[0];
  const check = job.match(/STATUS=\$\(curl[\s\S]*?\n          esac/)[0];
  for (const [status, exit] of [['404', 0], ['200', 0], ['401', 0], ['500', 0], ['404', 7]]) {
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', `curl() { printf '%s' "$TEST_STATUS"; return "$TEST_EXIT"; }\n${check}`], {
      encoding: 'utf8', env: { ...process.env, API_VERSION: '1.2.3-nightly.1', TEST_STATUS: status, TEST_EXIT: String(exit) },
    });
    assert.equal(result.status === 0, status === '404' && exit === 0, `${status}/${exit}`);
  }
});

test('paired VSIX artifacts remain flat and exact-versioned', () => {
  assert.match(workflow, /flatten-vsix-artifacts: true/);
  assert.match(packageWorkflow, /path: vsix-staging\/\*\.vsix/);
  assert.match(workflow, /vsix-name-pattern: 'apex-language-server-extension-\$\{\{ needs\.verify-source\.outputs\.source-host-version \}\}\.vsix'/);
});

console.log('Paired hotfix release workflow tests passed.');
