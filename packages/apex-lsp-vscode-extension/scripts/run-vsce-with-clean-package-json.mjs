#!/usr/bin/env node
/**
 * vsce reads package.json verbatim; --no-dependencies does not remove dev-only keys.
 * Strip tooling keys in a temp edit, run vsce, then restore (see .vscodeignore for file excludes).
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pjPath = join(root, 'package.json');
const backupPath = join(root, '.package.json.vsix-backup');

/** @type {readonly string[]} */
const STRIP_KEYS = ['scripts', 'wireit', 'devDependencies'];

const vsceArgs = process.argv.slice(2);

let exitCode = 0;
copyFileSync(pjPath, backupPath);
try {
  const pkg = JSON.parse(readFileSync(pjPath, 'utf8'));
  for (const k of STRIP_KEYS) {
    delete pkg[k];
  }
  writeFileSync(pjPath, JSON.stringify(pkg, null, 2) + '\n');
  execFileSync('npx', ['vsce', 'package', ...vsceArgs], { stdio: 'inherit', cwd: root });
} catch (err) {
  exitCode = typeof err?.status === 'number' ? err.status : 1;
} finally {
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, pjPath);
    unlinkSync(backupPath);
  }
}
process.exit(exitCode);
