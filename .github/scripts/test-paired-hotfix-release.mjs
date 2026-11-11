import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const workflow = readFileSync(
  join(process.cwd(), '.github', 'workflows', 'paired-hotfix-release.yml'),
  'utf8',
);
const packageWorkflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'package.yml'), 'utf8');
const resumeWorkflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'resume-paired-hotfix-api.yml'), 'utf8');
const manualPublishWorkflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'manual-publish.yml'), 'utf8');
const prereleasePromotionWorkflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'promote-prerelease.yml'), 'utf8');
const require = createRequire(import.meta.url);

assert.match(workflow, /source_sha:/, 'requires an immutable source SHA input');
assert.match(workflow, /\^\[0-9a-fA-F\]\{40\}\$/, 'rejects non-SHA source refs');
assert.match(workflow, /git rev-parse HEAD/, 'records the checked-out source identity');
assert.match(workflow, /pnpm --filter "\$PACKAGE_NAME" run typecheck/, 'verifies the API');
assert.match(workflow, /node \.github\/scripts\/validate-extension-api-release\.mjs/, 'calculates API SemVer from a release tag');
assert.match(workflow, /API_VERSION.*API tag-derived version/, 'requires the supplied API version to match the tag-derived version');
assert.match(workflow, /uses: \.\/\.github\/workflows\/package\.yml/, 'packages the host from the resolved SHA');
assert.match(workflow, /source-run-id: \$\{\{ github\.run_id \}\}/, 'publishes the packaged host artifact');
assert(workflow.includes('needs: [verify-source, verify-host-publication]'), 'publishes npm only after immutable host verification');
assert.doesNotMatch(workflow, /^\s*environment:/m, 'manual dispatch authorizes paired publication without Environment gates');
assert.match(workflow, /options: \[nightly, pre-release\]/, 'offers only the two prerelease channels');
assert.doesNotMatch(workflow, /\bstable\b|extension_version|target-stable-version/, 'removes stable host support entirely');
assert.match(workflow, /nightly\|pre-release\)/, 'rejects other channels at runtime');
assert.match(workflow, /slot: 'pre-release'/, 'always uses the host prerelease slot');
assert.match(workflow, /pre-release: 'true'/, 'always builds a prerelease host');
for (const command of ['typecheck', 'test', 'lint']) {
  assert.match(workflow, new RegExp(`pnpm --filter apex-language-server-extension run ${command}`), `explicitly runs host ${command}`);
}
assert(workflow.indexOf('Assert checkout identity') < workflow.indexOf('Build and verify host extension'));
assert(workflow.indexOf('Build and verify host extension') < workflow.indexOf('  package-extension:'));
assert.match(workflow, /publish-extension:\n    needs: \[[^\n]*marketplace-guard[^\n]*api-version-guard[^\n]*\]/, 'host publication depends on API availability before publishing');
assert.match(workflow, /flatten-vsix-artifacts: true/, 'requests publisher-compatible artifact roots');
assert.match(packageWorkflow, /flatten-vsix-artifacts:[\s\S]*?default: false\n        type: boolean/);
assert.match(packageWorkflow, /cp "\$vsix" vsix-staging\//, 'copies actual VSIXs to a staging root');
assert.match(packageWorkflow, /path: vsix-staging\/\*\.vsix/, 'uploads only flat VSIXs for paired use');
assert.match(packageWorkflow, /if: \$\{\{ !inputs.flatten-vsix-artifacts \}\}[\s\S]*?packages\/\*\*\/\*\.vsix/, 'preserves ordinary nested uploads');
assert.match(packageWorkflow, /package:packages:prerelease/);
assert.match(packageWorkflow, /package-web|web-target/, 'retains regular web packaging');
assert.equal((workflow.match(/name: paired-api-candidate-\$\{\{ github.run_id \}\}/g) || []).length, 3, 'candidate upload and both downloads use the same retry-safe name');
assert.doesNotMatch(workflow, /name: paired-api-candidate-.*run_attempt/);
for (const field of ['hostVsixFilename', 'hostVsixSha256', 'sourceHostPackageVersion', 'hostVersion']) {
  assert.match(workflow, new RegExp(field), `records ${field}`);
}
assert.match(workflow, /extension\/package\.json/, 'inspects packaged host identity');
assert.match(workflow, /createHash\('sha256'\)/, 'computes host checksum from VSIX bytes');
assert.match(workflow, /marketplace-guard:[\s\S]*?needs: \[verify-source, verify-pair\]/, 'checks publication safety after recording artifact identity');
assert.doesNotMatch(workflow, /No safe Marketplace identity verification path/, 'removes unconditional publication blocker');
assert.doesNotMatch(workflow, /--skip-duplicate/, 'duplicate skipping is not publication evidence');
const guardJob = workflow.split('  marketplace-guard:')[1].split('  publish-extension:')[0];
const verificationJob = workflow.split('  verify-host-publication:')[1]?.split('  publish-api:')[0];
assert(verificationJob, 'adds post-publication host verification');
assert.match(verificationJob, /needs: \[verify-source, publish-extension\]/);
for (const job of [guardJob, verificationJob]) {
  assert.match(job, /if: \$\{\{ !inputs.dry_run \}\}/, 'dry runs skip Marketplace checks');
  assert.match(job, /ref: \$\{\{ needs.verify-source.outputs.sha \}\}/, 'uses verified source client');
  assert.match(job, /corepack enable/);
  assert.match(job, /actions\/setup-node@v6/);
  assert.match(job, /pnpm install --frozen-lockfile/);
}
assert.equal((workflow.match(/name: paired-host-verification-\$\{\{ github.run_id \}\}/g) || []).length, 2, 'API consumes retry-safe verified host metadata');
assert.doesNotMatch(workflow, /name: paired-.*run_attempt/, 'paired artifacts are retry-safe by run id');
const apiJob = workflow.split('  publish-api:')[1];
const apiGuardJob = workflow.split('  api-version-guard:')[1]?.split(/\n  [\w-]+:/)[0];
assert(apiGuardJob, 'adds a pre-host-publication API availability guard');
assert.match(apiGuardJob, /needs: verify-source\n/, 'checks API availability after source verification');
assert.match(apiGuardJob, /if: \$\{\{ !inputs.dry_run \}\}/, 'dry runs skip API registry checks');
assert.match(apiGuardJob, /API_VERSION: \$\{\{ inputs.api_version \}\}/);
assert.doesNotMatch(apiGuardJob, /uses:|needs\.verify-source\.outputs|secrets\.|github\./, 'API guard uses no source files, artifacts, credentials, or source-derived outputs');
const registryCheck = job => job.match(/STATUS=\$\(curl[\s\S]*?\n          esac/)[0];
const earlyRegistryCheck = registryCheck(apiGuardJob);
const lateRegistryCheck = registryCheck(apiJob);
assert.equal(earlyRegistryCheck.replace('--output /dev/null', '--output api-release/registry-response.json'), lateRegistryCheck, 'retains the same immediate pre-npm fail-closed duplicate check');
for (const check of [earlyRegistryCheck, lateRegistryCheck]) {
  assert.match(check, /https:\/\/registry\.npmjs\.org\/@salesforce%2Fapex-language-server-extension-api\/\$API_VERSION/);
  for (const [status, curlExit] of [['404', 0], ['200', 0], ['401', 0], ['403', 0], ['429', 0], ['500', 0], ['000', 0], ['404', 7]]) {
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', `curl() { printf '%s' "$TEST_STATUS"; return "$TEST_CURL_EXIT"; }\n${check}`], {
      encoding: 'utf8',
      env: { ...process.env, API_VERSION: '1.2.3-nightly.1', TEST_STATUS: status, TEST_CURL_EXIT: String(curlExit) },
    });
    assert.ifError(result.error);
    assert.equal(result.status === 0, status === '404' && curlExit === 0, `only HTTP 404 with successful transport permits publication (${status}, curl exit ${curlExit})`);
  }
}
assert.doesNotMatch(apiJob, /name: paired-host-identity-/, 'API downloads verified metadata, not the unverified identity');
assert.doesNotMatch(workflow, /registries: '(?:all|ovsx)'|publishOpenVSX/, 'has no Open VSX publishing path');

const validation = workflow.match(/id: validate[\s\S]*?node <<'NODE'\n([\s\S]*?)\n          NODE/)[1];
const validate = (channel, version, hostVersion = '0.11.76', expectedVersion = version.split('-')[0]) => {
  let output = '';
  runInNewContext(validation, {
    require: name => name === 'node:fs' ? { appendFileSync: (_, text) => { output += text; } } :
      name.startsWith('./packages/') ? { version: hostVersion } : require(name),
    process: { env: { API_VERSION: version, CHANNEL: channel, EXPECTED_VERSION: expectedVersion, GITHUB_OUTPUT: 'output' } },
  });
  return output;
};
for (const channel of ['nightly', 'pre-release']) {
  assert.match(validate(channel, `1.2.3-${channel}.1`), new RegExp(`dist-tag=${channel}\\n`));
  for (const version of ['1.2.3', '1.2.3-beta.1', `1.2.3-${channel}`, `1.2.3-${channel}.1+build`]) {
    assert.throws(() => validate(channel, version), undefined, `rejects ${version}`);
  }
}
assert.throws(() => validate('stable', '1.2.3'));
assert.throws(() => validate('nightly', '1.2.3-nightly.1', '0.11.76', '1.2.4'), /API tag-derived version/);

const inspection = workflow.match(/name: Inspect host VSIX and record paired identity[\s\S]*?node <<'NODE'\n([\s\S]*?)\n          NODE/)[1];
const inspect = (files, version = '0.11.76', prerelease = true) => {
  let metadata = JSON.stringify({ sourceHostPackageVersion: '0.11.76' });
  const retained = [...files];
  runInNewContext(inspection, {
    require: name => name === 'node:fs' ? {
      readdirSync: () => [...retained],
      rmSync: path => { retained.splice(retained.indexOf(path.replace('vsix-artifacts/', '')), 1); },
      readFileSync: path => path.endsWith('.vsix') ? Buffer.from('host bytes') : metadata,
      writeFileSync: (_, text) => { metadata = text; },
    } : name === 'node:child_process' ? {
      execFileSync: (_, args) => args.at(-1) === 'extension/package.json' ?
        JSON.stringify({ name: 'apex-language-server-extension', publisher: 'salesforce', version }) :
        prerelease ? 'Microsoft.VisualStudio.Code.PreRelease" Value="true"' : '',
    } : require(name),
    process: { env: { SOURCE_HOST_VERSION: '0.11.76' } },
  });
  return { ...JSON.parse(metadata), retained };
};
const filename = 'apex-language-server-extension-0.11.76.vsix';
const metadata = inspect([filename, 'apex-language-server-extension-web-0.11.76.vsix']);
assert.equal(metadata.hostVsixFilename, filename);
assert.equal(metadata.hostVsixSha256, require('node:crypto').createHash('sha256').update('host bytes').digest('hex'));
assert.equal(metadata.hostVersion, '0.11.76');
assert.equal(metadata.sourceHostPackageVersion, '0.11.76');
assert.throws(() => inspect([]));
assert.throws(() => inspect([filename, 'apex-language-server-extension-0.11.75.vsix']));
assert.throws(() => inspect([filename], '0.11.75'));
assert.throws(() => inspect([filename], '0.11.76', false));

const guard = workflow.match(/name: Reject existing Marketplace host version[\s\S]*?node <<'NODE'\n([\s\S]*?)\n          NODE/)[1];
const verification = workflow.match(/name: Verify Marketplace host checksum[\s\S]*?node <<'NODE'\n([\s\S]*?)\n          NODE/)[1];
const marketplace = (script, response, clientError = false) => {
  let result = metadata;
  runInNewContext(script, {
    require: name => name === 'node:fs' ? {
      readFileSync: () => JSON.stringify(metadata),
      writeFileSync: (_, text) => { result = JSON.parse(text); },
    } : name === 'node:child_process' ? {
      execFileSync: (command, args, options) => {
        assert.equal(command, 'pnpm');
        assert.deepEqual(Array.from(args), ['exec', 'vsce', 'show', 'salesforce.apex-language-server-extension', '--json']);
        assert.equal(options.cwd, 'packages/apex-lsp-vscode-extension', 'uses the package-owned vsce client');
        if (clientError) throw new Error('Marketplace request failed');
        return typeof response === 'string' ? response : JSON.stringify(response);
      },
    } : require(name),
  });
  return result;
};
const published = (sha = metadata.hostVsixSha256, version = metadata.hostVersion, targetPlatform) => ({
  version, targetPlatform,
  properties: [{ key: 'Microsoft.VisualStudio.Services.VsixSha256', value: sha }],
});
assert.throws(() => marketplace(guard, { versions: [published()] }), /already published/);
assert.throws(() => marketplace(guard, { versions: [published(undefined, undefined, 'linux-x64')] }), /already published/);
marketplace(guard, { versions: [published(undefined, undefined, 'web'), published(undefined, '0.11.75')] });
marketplace(guard, { versions: [] });
for (const script of [guard, verification]) {
  assert.throws(() => marketplace(script, {}, true), /Marketplace request failed/);
  assert.throws(() => marketplace(script, 'not JSON'));
  assert.throws(() => marketplace(script, {}), /versions/);
}
const verified = marketplace(verification, { versions: [published(undefined, undefined, 'web'), published()] });
assert.equal(verified.hostPublication.immutableIdentityVerified, true);
assert.equal(verified.hostPublication.version, metadata.hostVersion);
assert.equal(verified.hostPublication.sha256, metadata.hostVsixSha256);
assert(Number.isFinite(Date.parse(verified.hostPublication.checkedAt)));
assert.equal(verified.hostVsixSha256, metadata.hostVsixSha256);
assert.throws(() => marketplace(verification, { versions: [published('a'.repeat(64))] }), /checksum/);
assert.throws(() => marketplace(verification, { versions: [{ version: metadata.hostVersion, properties: [] }] }), /SHA256/);
assert.throws(() => marketplace(verification, { versions: [published(undefined, undefined, 'web')] }), /exactly one/);
assert.throws(() => marketplace(verification, { versions: [published(undefined, '0.11.75')] }), /exactly one/);
assert.throws(() => marketplace(verification, { versions: [published(), published()] }), /exactly one/);
assert.match(workflow, /record-api-release-tag:/, 'records a tag after npm publication');
assert.match(workflow, /apex-language-server-extension-api-v\$API_VERSION/, 'tags each published API version');
assert.match(workflow, /API release tag already records this source/, 'makes verified release tag creation rerun-safe');

assert.match(resumeWorkflow, /source_run_id:/, 'resume requires the original paired run');
assert.match(resumeWorkflow, /source_sha:/, 'resume requires the original immutable source');
assert.match(resumeWorkflow, /api_version:/, 'resume requires the original API version');
assert.match(resumeWorkflow, /name: paired-api-candidate-\$\{\{ inputs\.source_run_id \}\}/, 'resume downloads the original API candidate');
assert.match(resumeWorkflow, /name: paired-host-verification-\$\{\{ inputs\.source_run_id \}\}/, 'resume requires the original verified host metadata');
assert.match(resumeWorkflow, /run-id: \$\{\{ inputs\.source_run_id \}\}/, 'resume binds downloads to the original run');
assert.match(resumeWorkflow, /Marketplace host checksum must match paired VSIX/, 'resume rechecks host publication bytes');
assert.doesNotMatch(resumeWorkflow, /^\s*environment:/m, 'manual dispatch authorizes recovery publication without Environment gates');
assert.match(resumeWorkflow, /npm version already matches the verified paired tarball/, 'resume verifies an existing npm version instead of republishing it');
assert.match(prereleasePromotionWorkflow, /permissions:\n\s+contents: write/, 'allows the prerelease promotion reusable workflow to create its release state');
assert.match(manualPublishWorkflow, /require-approval: 'false'/, 'manual dispatch authorizes the alternate manual publisher');
assert.match(manualPublishWorkflow, /permissions:\n\s+contents: write\n\s+packages: write\n\s+actions: read\n\s+checks: read/, 'grants the shared preparation workflow its required read permissions');
assert.doesNotMatch(prereleasePromotionWorkflow, /promote-extension-api:/, 'does not mutate npm API tags outside paired releases');
assert.match(packageWorkflow, /name: \$\{\{ steps\.calc-artifact-name\.outputs\.artifact-name \}\}[\s\S]*?overwrite: true/, 'allows package artifact retries');

const recoveryJob = resumeWorkflow.split('  verify-prior-pair:')[1].split('  publish-api:')[0];
assert.match(recoveryJob, /ref: \$\{\{ inputs\.source_sha \}\}/);
assert.match(recoveryJob, /persist-credentials: false/);
assert.match(recoveryJob, /corepack enable/);
assert.match(recoveryJob, /actions\/setup-node@v6/);
assert.match(recoveryJob, /pnpm install --frozen-lockfile/);
for (const name of ['API candidate', 'verified host metadata']) {
  const download = recoveryJob.split(`name: Download original ${name}`)[1].split('\n      - name:')[0];
  assert.match(download, /actions\/download-artifact@v8/);
  assert.match(download, /run-id: \$\{\{ inputs\.source_run_id \}\}/);
}
assert(recoveryJob.indexOf('Verify Marketplace host checksum') < recoveryJob.indexOf('Upload verified recovery candidate'));
assert.match(resumeWorkflow, /publish-api:\n    needs: verify-prior-pair\n/, 'recovery publication depends on verification of the prior pair');
assert.doesNotMatch(resumeWorkflow, /vsce publish|publish-extension:|vscode-manual-publish/);
assert.match(resumeWorkflow, /record-api-release-tag:\n    needs: publish-api/, 'recovery records the API release boundary after npm verification');
assert.match(resumeWorkflow, /apex-language-server-extension-api-v\$API_VERSION/, 'recovery tags the published API version');
assert.match(resumeWorkflow, /API release tag already records this source/, 'recovery tag creation is rerun-safe');
const recoveryScript = name => resumeWorkflow.match(new RegExp(`name: ${name}[\\s\\S]*?node <<'NODE'\\n([\\s\\S]*?)\\n          NODE`))[1];
const recoveryBytes = Buffer.from('original API tarball');
const recoveryMetadata = {
  ...verified, sourceSha: 'a'.repeat(40), apiVersion: '1.2.3-nightly.1', channel: 'nightly', distTag: 'nightly',
  hostSourceRunId: '123', tarballSha256: require('node:crypto').createHash('sha256').update(recoveryBytes).digest('hex'),
};
const recoveryEnv = { SOURCE_SHA: recoveryMetadata.sourceSha, SOURCE_RUN_ID: '123', API_VERSION: recoveryMetadata.apiVersion,
  CHANNEL: 'nightly', GITHUB_REPOSITORY: 'forcedotcom/apex-language-support', GH_TOKEN: 'read-only-test-token' };
const recoveryRun = { repository: { full_name: recoveryEnv.GITHUB_REPOSITORY }, path: '.github/workflows/paired-hotfix-release.yml',
  name: 'Paired Hotfix Release', event: 'workflow_dispatch', head_sha: recoveryEnv.SOURCE_SHA };
const recoveryPackage = { name: '@salesforce/apex-language-server-extension-api', version: recoveryEnv.API_VERSION };
const validateRecovery = (overrides = {}, env = {}, bytes = recoveryBytes, run = recoveryRun, manifest = recoveryPackage, calls = []) => runInNewContext(recoveryScript('Validate prior paired release identity'), {
  require: name => name === 'node:fs' ? {
    readFileSync: path => path.endsWith('.tgz') ? bytes : JSON.stringify({ ...recoveryMetadata, ...overrides }),
  } : name === 'node:child_process' ? {
    execFileSync: (command, args) => {
      calls.push(command);
      if (command === 'gh') {
        assert.deepEqual(Array.from(args), ['api', `repos/${recoveryEnv.GITHUB_REPOSITORY}/actions/runs/${recoveryEnv.SOURCE_RUN_ID}`]);
        if (run instanceof Error) throw run;
        return typeof run === 'string' ? run : JSON.stringify(run);
      }
      assert.equal(command, 'tar');
      assert.deepEqual(Array.from(args), ['-xOf', 'api-release/extension-api.tgz', 'package/package.json']);
      if (manifest instanceof Error) throw manifest;
      return typeof manifest === 'string' ? manifest : JSON.stringify(manifest);
    },
  } : require(name), process: { env: { ...recoveryEnv, ...env } },
});
validateRecovery();
for (const overrides of [
  { sourceSha: 'b'.repeat(40) }, { apiVersion: '1.2.3-nightly.2' }, { channel: 'pre-release' },
  { distTag: 'pre-release' }, { hostSourceRunId: '456' }, { hostPublication: { immutableIdentityVerified: false } },
  { hostPublication: { ...verified.hostPublication, sha256: 'b'.repeat(64) } },
  { hostPublication: { ...verified.hostPublication, version: '0.11.75' } },
]) assert.throws(() => validateRecovery(overrides), undefined, `rejects mismatched recovery metadata ${JSON.stringify(overrides)}`);
assert.throws(() => validateRecovery({}, {}, Buffer.from('changed tarball')), /checksum/);
assert.throws(() => validateRecovery({}, { SOURCE_SHA: 'main' }), /SHA/);
test('recovery authenticates original run provenance rather than trusting artifact names', () => {
  for (const override of [
    { repository: { full_name: 'other/repository' } }, { path: '.github/workflows/other.yml' },
    { name: 'Other workflow' }, { event: 'pull_request' }, { head_sha: 'b'.repeat(40) },
  ]) assert.throws(() => validateRecovery({}, {}, recoveryBytes, { ...recoveryRun, ...override }),
    undefined, `rejects mismatched original run ${JSON.stringify(override)}`);
  for (const response of [{}, 'not JSON', new Error('GitHub request failed')]) {
    assert.throws(() => validateRecovery({}, {}, recoveryBytes, response));
  }
  const calls = [];
  validateRecovery({}, {}, recoveryBytes, recoveryRun, recoveryPackage, calls);
  assert(calls.includes('gh'), 'queries the original run through GitHub API');
  assert.match(recoveryJob, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(recoveryJob, /GITHUB_REPOSITORY: \$\{\{ github\.repository \}\}/);
  assert.match(resumeWorkflow, /permissions:\n  actions: read\n  contents: read/);
  assert.doesNotMatch(recoveryJob, /permissions:|secrets\./, 'source-run artifact token remains read-only');
  for (const name of ['API candidate', 'verified host metadata']) {
    const download = recoveryJob.split(`name: Download original ${name}`)[1].split('\n      - name:')[0];
    assert.match(download, /github-token: \$\{\{ github\.token \}\}/);
  }
});
test('recovery inspects the packed API name and version before npm publication', () => {
  for (const manifest of [
    { ...recoveryPackage, name: '@other/package' }, { ...recoveryPackage, version: '1.2.3-nightly.2' },
    {}, 'not JSON', new Error('Missing package/package.json'),
  ]) assert.throws(() => validateRecovery({}, {}, recoveryBytes, recoveryRun, manifest));
  const calls = [];
  validateRecovery({}, {}, recoveryBytes, recoveryRun, recoveryPackage, calls);
  assert(calls.includes('tar'), 'inspects package/package.json in the candidate tarball');
  assert(recoveryJob.indexOf('Validate prior paired release identity') < recoveryJob.indexOf('Upload verified recovery candidate'));
});
const recoveryVerification = recoveryScript('Verify Marketplace host checksum');
marketplace(recoveryVerification, { versions: [published()] });
for (const response of [{}, { versions: [] }, { versions: [published('b'.repeat(64))] },
  { versions: [published(), published()] }, { versions: [published(undefined, undefined, 'web')] },
  { versions: [{ version: metadata.hostVersion, properties: [] }] }, 'not JSON']) {
  assert.throws(() => marketplace(recoveryVerification, response));
}
assert.throws(() => marketplace(recoveryVerification, {}, true), /Marketplace request failed/);

const npmIntegrity = 'sha512-' + require('node:crypto').createHash('sha512').update(recoveryBytes).digest('base64');
const npm404 = Object.assign(new Error('npm lookup failed'), { stdout: JSON.stringify({ error: { code: 'E404' } }) });
const recoverNpm = ({ version = { version: recoveryEnv.API_VERSION, dist: { integrity: npmIntegrity } },
  tags = { nightly: recoveryEnv.API_VERSION }, bytes = recoveryBytes,
  postVersions = [], postTags = [], state = {} } = {}) => {
  const calls = [];
  let published = false;
  let versionReads = 0;
  let tagReads = 0;
  Object.assign(state, { calls, writes: 0, waits: 0 });
  runInNewContext(recoveryScript('Publish or verify the paired API tarball'), {
    require: name => name === 'node:fs' ? {
      readFileSync: path => path.endsWith('.tgz') ? bytes : JSON.stringify(recoveryMetadata),
      writeFileSync: (path, text) => {
        assert.equal(path, 'api-release/extension-api-release.json');
        state.metadata = JSON.parse(text);
        state.writes++;
      },
    } : name === 'node:child_process' ? {
      execFileSync: (command, args) => {
        assert.equal(command, 'npm');
        calls.push(Array.from(args));
        if (args[0] === 'publish') { published = true; return ''; }
        assert(args.includes('--prefer-online'));
        const isVersion = args[1].includes('@1.2.3');
        const response = isVersion ? versionReads++ === 0 ? version :
          postVersions.length ? postVersions[Math.min(versionReads - 2, postVersions.length - 1)] :
            published ? { version: recoveryEnv.API_VERSION, dist: { integrity: npmIntegrity } } : version :
          { 'dist-tags': postTags.length ? postTags[Math.min(tagReads++, postTags.length - 1)] : tags };
        if (response instanceof Error) throw response;
        if (tags instanceof Error && !args[1].includes('@1.2.3')) throw tags;
        return JSON.stringify(response);
      },
    } : require(name),
    process: { env: { PACKAGE_NAME: '@salesforce/apex-language-server-extension-api', API_VERSION: recoveryEnv.API_VERSION, DIST_TAG: 'nightly' },
      exit: () => { throw new Error('Recovery script must return without terminating the test'); } },
    console: { log: () => {} },
    Atomics: { wait: () => { state.waits++; } },
  });
  return state;
};
assert.equal(recoverNpm().calls.filter(args => args[0] === 'publish').length, 0);
for (const options of [
  { version: { version: '1.2.3-nightly.2', dist: { integrity: npmIntegrity } } },
  { version: { version: recoveryEnv.API_VERSION, dist: { integrity: 'wrong' } } },
  { tags: { nightly: '1.2.3-nightly.2' } }, { tags: npm404 },
  { version: null },
  { version: new Error('Registry unavailable 404') }, { bytes: Buffer.from('changed tarball') },
]) assert.throws(() => recoverNpm(options));
assert.equal(recoverNpm({ version: npm404 }).calls.filter(args => args[0] === 'publish').length, 1);

test('recovery verifies and records npm identity after fresh or existing publication', () => {
  for (const version of [npm404, { version: recoveryEnv.API_VERSION, dist: { integrity: npmIntegrity } }]) {
    const result = recoverNpm({ version, postVersions: [npm404,
      { version: recoveryEnv.API_VERSION, dist: { integrity: npmIntegrity } }],
      postTags: [{ nightly: '1.2.3-nightly.2' }, { nightly: recoveryEnv.API_VERSION }] });
    const publishIndex = result.calls.findIndex(args => args[0] === 'publish');
    assert.equal(result.calls.filter(args => args[0] === 'publish').length, version === npm404 ? 1 : 0);
    assert(result.calls.slice(publishIndex + 1).some(args => args[0] === 'view'), 'fresh publication must verify the registry after npm publish');
    assert.equal(result.writes, 3, 'records lookup failure, stale tag, and successful verification');
    assert.equal(result.waits, 2, 'retries registry propagation');
    const verification = result.metadata.npmVerification;
    assert.equal(verification.verified, true);
    assert.equal(verification.version, recoveryEnv.API_VERSION);
    assert.equal(verification.integrity, npmIntegrity);
    assert.equal(verification.distTag, 'nightly');
    assert.equal(verification.distTagVersion, recoveryEnv.API_VERSION);
    assert(Number.isFinite(Date.parse(verification.checkedAt)));
    assert.equal(result.metadata.tarballSha256, recoveryMetadata.tarballSha256);
  }
});

test('recovery persists failed post-publication verification and uploads final metadata', () => {
  for (const options of [
    { postVersions: [npm404] },
    { postVersions: [{ version: '1.2.3-nightly.2', dist: { integrity: npmIntegrity } }] },
    { postVersions: [{ version: recoveryEnv.API_VERSION, dist: { integrity: 'wrong' } }] },
    { postTags: [{ nightly: '1.2.3-nightly.2' }] },
  ]) {
    for (const version of [npm404, { version: recoveryEnv.API_VERSION, dist: { integrity: npmIntegrity } }]) {
      const state = {};
      assert.throws(() => recoverNpm({ version, ...options, state }), /Post-publish npm verification failed/);
      assert.equal(state.writes, 6);
      assert.equal(state.waits, 5);
      assert.equal(state.metadata.npmVerification.verified, false);
    }
  }
  const upload = resumeWorkflow.split('name: Upload actual publication metadata')[1];
  assert(upload, 'recovery uploads final publication metadata');
  assert.match(upload, /if: always\(\)/);
  assert.match(upload, /actions\/upload-artifact@v7/);
  assert.match(upload, /path: api-release\/extension-api-release.json/);
  assert.match(upload, /overwrite: true/);
});

test('recovery candidate upload supports rerunning the same workflow run', () => {
  const upload = recoveryJob.split('name: Upload verified recovery candidate')[1];
  assert.match(upload, /name: paired-recovery-candidate-\$\{\{ github.run_id \}\}/);
  assert.match(upload, /overwrite: true/);
});

console.log('Paired hotfix release workflow tests passed.');

test('manual dispatch authorizes publication while verification guards preserve ordering', () => {
  for (const source of [workflow, resumeWorkflow, manualPublishWorkflow]) {
    assert.match(source, /on:\n  workflow_dispatch:/, 'publication is manually dispatched');
  }
  assert.doesNotMatch(workflow, /approve-marketplace-publication/, 'does not require a separate Marketplace approval');
  const publishJob = workflow.split('  publish-extension:')[1].split('  verify-host-publication:')[0];
  assert.match(publishJob, /needs: \[verify-source, package-extension, marketplace-guard, api-version-guard\]/);
  assert.match(publishJob, /if: \$\{\{ !inputs.dry_run \}\}/);
  assert.match(publishJob, /require-approval: 'false'/);
  assert.match(apiJob, /needs: \[verify-source, verify-host-publication\]/);
  assert.match(apiJob, /if: \$\{\{ !inputs.dry_run \}\}/);
  assert.match(resumeWorkflow, /publish-api:\n    needs: verify-prior-pair\n/);
});

test('release documentation identifies manual dispatch as the authorization control', () => {
  for (const path of [
    '.github/workflows/README.md', 'docs/releasing.md',
    'packages/apex-language-server-extension-api/README.md',
  ]) {
    const documentation = readFileSync(join(process.cwd(), path), 'utf8');
    assert(/Manual dispatch is the authorization control/.test(documentation), `${path} must document manual dispatch authorization`);
    assert.doesNotMatch(documentation, /requires IDE Experience approval|obtain IDE Experience approval|approve the environment gate|before approving npm publication|waits for a separate approval/, path);
  }
});

test('only an exact source-version universal VSIX reaches the shared publisher', () => {
  for (const name of [
    'apex-language-server-extension-0x11x76.vsix',
    'apex-language-server-extension-0.11.75.vsix',
    'apex-language-server-extension-0.11.76$(touch PWNED).vsix',
    'apex-language-server-extension-0.11.76";touch PWNED;#.vsix',
    'apex-language-server-extension-0.11.76\nPWNED.vsix',
  ]) assert.throws(() => inspect([name]), /filename/, `rejects unsafe/mismatched filename ${JSON.stringify(name)}`);
  assert.deepEqual(inspect([filename, 'apex-language-server-extension-web-0.11.76.vsix', 'unrelated.vsix']).retained, [filename]);
  assert.throws(() => validate('nightly', '1.2.3-nightly.1', '0.11.76$(touch PWNED)'), /Host.*SemVer/);
  const pairJob = workflow.split('  verify-pair:')[1].split('  marketplace-guard:')[0];
  assert.match(pairJob, /name: paired-host-candidate-\$\{\{ github.run_id \}\}[\s\S]*?path: vsix-artifacts\/\*\.vsix/);
  const publishJob = workflow.split('  publish-extension:')[1].split('  verify-host-publication:')[0];
  assert.match(publishJob, /vsix-artifact-name: paired-host-candidate-\$\{\{ github.run_id \}\}/);
  assert.match(publishJob, /vsix-name-pattern: 'apex-language-server-extension-\$\{\{ needs.verify-source.outputs.source-host-version \}\}\.vsix'/);
});

if (process.env.SHARED_WORKFLOWS_DIR) {
  const shared = readFileSync(join(process.env.SHARED_WORKFLOWS_DIR, '.github/workflows/vscode-manual-publish.yml'), 'utf8');
  const action = readFileSync(join(process.env.SHARED_WORKFLOWS_DIR, '.github/actions/publish-vsix/action.yml'), 'utf8');
  const scripts = action.matchAll(/      run: \|\n([\s\S]*?)(?=\n    - name:|$)/g);
  const actionScripts = [...scripts].map(match => match[1].replace(/^        /gm, ''));
  const sharedScripts = [...shared.matchAll(/^        run: \|\n((?: {10}.*\n|\n)*)|^        run: (.+)/gm)]
    .map(match => (match[1] ?? match[2]).replace(/^          /gm, ''));
  test('shared run scripts never interpolate inputs directly', () => {
    assert(sharedScripts.length > 0);
    for (const script of sharedScripts) {
      assert.doesNotMatch(script, /\$\{\{ inputs\./, 'inputs must enter shared run scripts through env');
    }
  });
  test('shared preparation rejects invalid source, slot, registry and boolean inputs', () => {
    const env = { ...process.env, VERSION_TAG: 'extension-v0.5.3-nightly.20260301', SOURCE_RUN_ID: '',
      SKIP_QC: 'false', BYPASS: '', REGISTRIES: 'vsce', PUBLISH_WEB_VSIX: 'false', SLOT: 'pre-release',
      EXCLUDE_WEB_VSIX: 'false', DRY_RUN: 'false', REQUIRE_APPROVAL: 'true' };
    const validate = overrides => spawnSync('bash', ['-e', '-o', 'pipefail', '-c', sharedScripts[0]], {
      encoding: 'utf8', env: { ...env, ...overrides },
    });
    assert.equal(validate({}).status, 0);
    assert.equal(validate({ VERSION_TAG: '', SOURCE_RUN_ID: '123', SKIP_QC: 'true', BYPASS: 'BYPASS' }).status, 0);
    for (const overrides of [
      { VERSION_TAG: '', SOURCE_RUN_ID: '123/../../other' }, { VERSION_TAG: '-v0.5.3' },
      { VERSION_TAG: 'extension-v0.5.3$(printf INJECTED)' }, { SLOT: 'other' }, { REGISTRIES: 'other' },
      ...['SKIP_QC', 'PUBLISH_WEB_VSIX', 'EXCLUDE_WEB_VSIX', 'DRY_RUN', 'REQUIRE_APPROVAL'].map(key => ({ [key]: 'garbage' })),
    ]) assert.notEqual(validate(overrides).status, 0, `rejects ${JSON.stringify(overrides)}`);
  });
  test('shared stable override validation treats versions as data, not Node source', () => {
    const resolve = sharedScripts[1];
    assert.doesNotMatch(resolve, /node -e .*\$(?:TARGET_STABLE|PRERELEASE_VERSION|AUTO_STABLE)/);
    const safeguards = resolve.split('if [ -n "$TARGET_STABLE" ]; then')[1].split('STABLE_VERSION="$TARGET_STABLE"')[0];
    const validate = target => spawnSync('bash', ['-e', '-o', 'pipefail', '-c', `git() { return 0; }\n${safeguards}`], {
      encoding: 'utf8', env: { ...process.env, TARGET_STABLE: target, PRERELEASE_VERSION: '0.5.3', EXTENSION_NAME: 'extension' },
    });
    assert.equal(validate('0.6.1').status, 0);
    for (const target of ['invalid', '0.7.1', '0.4.1', "0.6.1'); console.log('INJECTED'); //", '0.6.1$(printf INJECTED)']) {
      const result = validate(target);
      assert.notEqual(result.status, 0, `rejects ${JSON.stringify(target)}`);
      assert.match(result.stdout, /ERROR: target-stable-version/);
      assert.doesNotMatch(result.stderr, /SyntaxError/, 'invalid input must not alter Node source');
    }
  });
  test('shared preparation does not expose publishing credentials to checkout or install', () => {
    const prepare = shared.split('  prepare:')[1].split('  # ── preview')[0];
    const checkout = prepare.split('      - name: Checkout')[1].split('      - name: Setup')[0];
    assert.match(checkout, /persist-credentials: false/);
    assert.doesNotMatch(checkout, /token:/);
    assert.doesNotMatch(prepare, /secrets\.|IDEE_GH_TOKEN/);
    assert.doesNotMatch(prepare, /git fetch/, 'full-history checkout already supplies tags; preparation must not require persisted credentials');
    assert.match(prepare, /permissions:\n      contents: read\n      actions: read\n      checks: read/);
    assert.equal((prepare.match(/GH_TOKEN: \$\{\{ github.token \}\}/g) || []).length, 2);
  });
  test('shared publisher consumes literal VSIX paths and validates tool/boolean inputs', () => {
    for (const script of actionScripts) assert.doesNotMatch(script, /\$\{\{ inputs\./, 'inputs must enter bash through env, not script interpolation');
    assert.match(action, /publish_with_retry npx @vscode\/vsce publish --packagePath "\$VSIX_PATH"/);
    assert.match(action, /publish_with_retry npx ovsx publish "\$VSIX_PATH"/);
    const env = { ...process.env, VSIX_PATH: filename, PUBLISH_TOOL: 'vsce', PRE_RELEASE: 'false', DRY_RUN: 'false' };
    // Stub only the file-existence check; exercise the workflow's actual input validation.
    const runValidation = overrides => spawnSync('bash', ['-e', '-o', 'pipefail', '-c', `function [ { if [[ "$1" == "!" && "$2" == "-f" ]]; then return 1; fi; builtin [ "$@"; }\n${actionScripts[0]}`], { encoding: 'utf8', env: { ...env, ...overrides } });
    assert.equal(runValidation({}).status, 0);
    for (const overrides of [{ PUBLISH_TOOL: 'vsce$(exit 0)' }, { PRE_RELEASE: 'garbage' }, { DRY_RUN: 'false; exit 0' }]) {
      assert.notEqual(runValidation(overrides).status, 0, `rejects ${JSON.stringify(overrides)}`);
    }
    for (const tool of ['vsce', 'ovsx']) {
      const path = './vsix-artifacts/extension$(printf INJECTED)"; echo INJECTED;#.vsix';
      const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', `npx() { printf 'ARG:%s\\n' "$@"; }\n${actionScripts[2]}`], {
        encoding: 'utf8', env: { ...env, PUBLISH_TOOL: tool, VSIX_PATH: path, VSCE_PERSONAL_ACCESS_TOKEN: 'test', OVSX_PAT: 'test', GITHUB_OUTPUT: '/dev/null' },
      });
      assert.equal(result.status, 0, result.stderr);
      assert(result.stdout.split('\n').includes(`ARG:${path}`), 'passes the literal filename as one argument without evaluating it');
    }
  });
  test('shared VSIX path outputs use env rather than generated shell source', () => {
    const resolvePath = shared.split('      - name: Resolve publish-ready VSIX path')[1].split('      - name: Upload publish-ready VSIX')[0];
    const script = resolvePath.split('        run: |')[1];
    assert.doesNotMatch(script, /\$\{\{/);
    assert.match(resolvePath, /SOURCE_VSIX_PATH: \$\{\{ steps.source-vsix.outputs.vsix-file \}\}/);
    assert.match(resolvePath, /REPACKED_VSIX_PATH: \$\{\{ steps.repack.outputs.vsix-path \}\}/);
  });
}
