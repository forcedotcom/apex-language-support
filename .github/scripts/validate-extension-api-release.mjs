import { execFileSync } from 'node:child_process';
import { inc, valid } from 'semver';

const tagPrefix = 'apex-language-server-extension-api-v';
const version = process.env.API_VERSION;
const sourceSha = process.env.SOURCE_SHA;

if (!valid(version)) {
  throw new Error('API_VERSION must be a valid SemVer version.');
}

const baselineTag = execFileSync(
  'git',
  ['describe', '--tags', '--abbrev=0', '--match', `${tagPrefix}*`, 'HEAD'],
  { encoding: 'utf8' },
).trim();
const baselineVersion = baselineTag.slice(tagPrefix.length);
if (!baselineTag.startsWith(tagPrefix) || !valid(baselineVersion)) {
  throw new Error(`Invalid API release tag: ${baselineTag}`);
}

const baselineSha = execFileSync('git', ['rev-parse', `${baselineTag}^{commit}`], {
  encoding: 'utf8',
}).trim();
if (!/^[0-9a-f]{40}$/i.test(baselineSha)) {
  throw new Error(`API release tag ${baselineTag} does not resolve to a commit.`);
}

const sourceRef = sourceSha || 'HEAD';
if (sourceSha && !/^[0-9a-f]{40}$/i.test(sourceSha)) {
  throw new Error('SOURCE_SHA must be a full commit SHA.');
}
const resolvedSourceSha = execFileSync('git', ['rev-parse', `${sourceRef}^{commit}`], {
  encoding: 'utf8',
}).trim();
if (!/^[0-9a-f]{40}$/i.test(resolvedSourceSha)) {
  throw new Error(`Cannot resolve API release source ${sourceRef}.`);
}

try {
  execFileSync('git', ['merge-base', '--is-ancestor', baselineSha, resolvedSourceSha]);
} catch {
  throw new Error(`API release source ${resolvedSourceSha} does not descend from ${baselineTag}.`);
}

const base = baselineVersion.match(/^(\d+\.\d+\.\d+)/)?.[1];
if (!base) {
  throw new Error(`API release tag ${baselineTag} has no stable SemVer core.`);
}

const commits = execFileSync(
  'git',
  [
    'log',
    '--format=%B%x00',
    `${baselineTag}..${resolvedSourceSha}`,
    '--',
    'packages/apex-language-server-extension-api',
  ],
  { encoding: 'utf8' },
).split('\0');

const messages = commits.filter(Boolean);
if (messages.length === 0) {
  throw new Error(`API release requires an API package commit after ${baselineTag}.`);
}

const bump = messages.some((message) => /BREAKING CHANGE:|!:/i.test(message))
  ? 'major'
  : messages.some((message) => /^feat(?:\([^)]*\))?:/im.test(message))
    ? 'minor'
    : messages.some((message) => /^fix(?:\([^)]*\))?:/im.test(message))
      ? 'patch'
      : undefined;

if (!bump) {
  throw new Error(
    'API commits must include fix:, feat:, or a breaking-change Conventional Commit.',
  );
}

const expected = inc(base, bump);
if (!expected) {
  throw new Error(`Cannot calculate a ${bump} bump from ${base}.`);
}

const suppliedCore = version.match(/^(\d+\.\d+\.\d+)/)?.[1];
if (suppliedCore !== expected) {
  throw new Error(
    `API version ${version} does not match the ${bump} bump from ${base} (${expected}).`,
  );
}

console.log(`baseline-tag=${baselineTag}`);
console.log(`baseline-sha=${baselineSha}`);
console.log(`baseline-version=${baselineVersion}`);
console.log(`source-sha=${resolvedSourceSha}`);
console.log(`version=${expected}`);
console.log(`bump=${bump}`);
