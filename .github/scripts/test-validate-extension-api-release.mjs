import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = process.cwd();
const fixtureRoot = join(tmpdir(), `extension-api-release-${process.pid}`);
const tagPrefix = 'apex-language-server-extension-api-v';

const run = ({ name, baseline = '0.11.75-nightly.1', commit, version, status = 0, output }) => {
  const directory = join(fixtureRoot, name);
  mkdirSync(join(directory, 'packages', 'apex-language-server-extension-api'), { recursive: true });
  execFileSync('git', ['init', '--quiet'], { cwd: directory });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: directory });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: directory });
  writeFileSync(join(directory, 'packages', 'apex-language-server-extension-api', 'contract.ts'), 'export {}\n');
  execFileSync('git', ['add', '.'], { cwd: directory });
  execFileSync('git', ['commit', '--quiet', '-m', 'chore: baseline'], { cwd: directory });
  if (baseline) execFileSync('git', ['tag', '--annotate', `${tagPrefix}${baseline}`, '--message', 'baseline'], { cwd: directory });
  if (commit) {
    writeFileSync(join(directory, 'packages', 'apex-language-server-extension-api', 'contract.ts'), `${commit}\n`);
    execFileSync('git', ['add', '.'], { cwd: directory });
    execFileSync('git', ['commit', '--quiet', '-m', commit], { cwd: directory });
  }
  let actual = '';
  let actualStatus = 0;
  try {
    actual = execFileSync('node', [join(repoRoot, '.github', 'scripts', 'validate-extension-api-release.mjs')], {
      cwd: directory, encoding: 'utf8', env: { ...process.env, API_VERSION: version }, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    actualStatus = error.status;
    actual = error.stderr.toString();
  }
  assert.equal(actualStatus, status, name);
  assert.match(actual, output, name);
};

try {
  run({ name: 'patch', commit: 'fix(api): correct a compatible response', version: '0.11.76-nightly.1', output: /baseline-version=0.11.75-nightly.1[\s\S]*version=0.11.76[\s\S]*bump=patch/ });
  run({ name: 'minor', commit: 'feat(api): add a capability', version: '0.12.0-pre-release.1', output: /version=0.12.0[\s\S]*bump=minor/ });
  run({ name: 'major', commit: 'feat(api)!: remove a capability', version: '1.0.0-nightly.1', output: /version=1.0.0[\s\S]*bump=major/ });
  run({ name: 'wrong-bump', commit: 'feat(api): add a capability', version: '0.11.76-nightly.1', status: 1, output: /does not match the minor bump/ });
  run({ name: 'no-api-commit', version: '0.11.76-nightly.1', status: 1, output: /requires an API package commit/ });
  run({ name: 'no-tag', baseline: null, commit: 'fix(api): change', version: '0.11.76-nightly.1', status: 1, output: /No names found/ });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('Extension API release tag SemVer tests passed.');
