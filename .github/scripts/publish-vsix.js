#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('./logger-util');

// Publishes the .vsix that matches the version in the package.json of the provided package directory
const packageDir = process.argv[2];
if (!packageDir) {
  console.error('Usage: node publish-vsix.js <path/to/package>');
  process.exit(1);
}

const packageJsonPath = path.join(packageDir, 'package.json');
const packageVersion = JSON.parse(
  fs.readFileSync(packageJsonPath, 'utf8'),
).version;
const vsixFiles = fs
  .readdirSync(packageDir)
  .filter((file) => file.endsWith(`-${packageVersion}.vsix`));

if (vsixFiles.length === 0) {
  console.error(
    `No VSIX found in ${packageDir} matching version ${packageVersion}`,
  );
  process.exit(1);
}

const vsixPath = path.join(packageDir, vsixFiles[0]);
const vsceToken = process.env.VSCE_PERSONAL_ACCESS_TOKEN;
const isPreRelease = process.env.PRE_RELEASE === 'true';

try {
  const preReleaseFlag = isPreRelease ? '--pre-release' : '';
  execSync(
    `npx vsce publish --pat ${vsceToken} --packagePath ${vsixPath} --skip-duplicate ${preReleaseFlag}`,
    { stdio: 'inherit' },
  );
  console.log(
    `Successfully published ${vsixPath}${isPreRelease ? ' as pre-release' : ''}`,
  );
} catch (error) {
  console.error(`Error publishing ${vsixPath}:`, error);
  process.exit(1);
}
