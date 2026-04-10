#!/usr/bin/env node
/**
 * Web-target VSIX for CBWeb: vsce --target web, then trim desktop-only payloads from the archive.
 * Must run after universal `package` / `package-prerelease` (Wireit dependency) so package.json strip/restore does not race.
 */
import { execFileSync, execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const prerelease = process.argv.includes('--prerelease');
const vsceArgs = ['--target', 'web', '--no-dependencies'];
if (prerelease) vsceArgs.push('--pre-release');

execFileSync('node', [join(root, 'scripts/run-vsce-with-clean-package-json.mjs'), ...vsceArgs], {
  stdio: 'inherit',
  cwd: root,
});

const webFiles = readdirSync(root).filter((f) => f.includes('-web-') && f.endsWith('.vsix'));
if (webFiles.length === 0) {
  throw new Error('Expected a *-web-*.vsix in packages/apex-lsp-vscode-extension after vsce package --target web');
}
const webVsixName = webFiles.sort().at(-1);
const webVsixPath = join(root, webVsixName);
const webDir = dirname(webVsixPath);
const base = basename(webVsixPath);

// Match previous CI trim; ignore missing members (|| true) for robustness across vsce output changes.
execSync(
  `zip -d ${JSON.stringify(base)} extension/dist/extension.js extension/dist/server.node.js ` +
    `'extension/dist/*.map' 'extension/dist/webview/*.map' 2>/dev/null || true`,
  { cwd: webDir, stdio: 'inherit', shell: '/bin/bash' },
);
