#!/usr/bin/env node
/**
 * sync-claude-skills.mjs
 *
 * Keeps ALS's allowlisted Claude skills/agents/commands in sync with the
 * salesforcedx-vscode monorepo. Driven by .claude/skills-sync.json.
 *
 * What it does:
 *   1. Reads the allowlist + upstream repo/ref from .claude/skills-sync.json.
 *   2. Shallow sparse-checkouts only the allowlisted paths from upstream into a temp dir.
 *   3. Copies each upstream path over the local copy (skills are whole dirs; agents/commands are files).
 *   4. Prints a summary of which paths changed.
 *
 * It does NOT commit or push — the GitHub Action (.github/workflows/claude-skills-sync.yml)
 * wraps this and opens a drift PR via the working-tree changes. Run locally any time with:
 *   node scripts/sync-claude-skills.mjs            # apply changes to working tree
 *   node scripts/sync-claude-skills.mjs --check    # exit 1 if drift exists, change nothing
 *
 * Items NOT in the allowlist (see "ownedByAls" in the config) are ALS-owned and never touched.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(REPO_ROOT, '.claude', 'skills-sync.json');
const CHECK_ONLY = process.argv.includes('--check');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

if (!existsSync(CONFIG_PATH)) {
  console.error(`Config not found: ${CONFIG_PATH}`);
  process.exit(2);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const { repo, ref, claudeDir } = config.upstream;
const localClaude = join(REPO_ROOT, claudeDir);

// Build the list of upstream paths (relative to repo root) we care about.
const targets = [];
for (const skill of config.allowlist.skills ?? []) {
  targets.push({ kind: 'dir', rel: `${claudeDir}/skills/${skill}` });
}
for (const agent of config.allowlist.agents ?? []) {
  targets.push({ kind: 'file', rel: `${claudeDir}/agents/${agent}` });
}
for (const cmd of config.allowlist.commands ?? []) {
  targets.push({ kind: 'file', rel: `${claudeDir}/commands/${cmd}` });
}

if (targets.length === 0) {
  log('Allowlist is empty — nothing to sync.');
  process.exit(0);
}

log(`Syncing ${targets.length} allowlisted path(s) from ${repo}@${ref}`);

// Shallow sparse checkout of upstream into a temp dir.
const work = mkdtempSync(join(tmpdir(), 'als-skills-sync-'));
const cloneUrl = `https://github.com/${repo}.git`;
let changed = [];
try {
  run('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', ref, cloneUrl, work]);
  // --no-cone lets us list individual files (agents/commands) as well as dirs (skills);
  // cone mode treats every pattern as a directory and rejects file paths.
  run('git', ['-C', work, 'sparse-checkout', 'set', '--no-cone', ...targets.map((t) => t.rel)]);

  for (const t of targets) {
    const upstreamPath = join(work, t.rel);
    const localPath = join(REPO_ROOT, t.rel);
    if (!existsSync(upstreamPath)) {
      log(`  ⚠ upstream missing: ${t.rel} (skipped — removed upstream or renamed?)`);
      continue;
    }
    // Detect drift with git diff --no-index (works for files and dirs).
    let differs = false;
    try {
      run('git', ['diff', '--no-index', '--quiet', localPath, upstreamPath]);
    } catch (e) {
      // git diff exits 1 when files differ, >1 on error. Treat 1 as "differs".
      differs = (e.status === 1) || !existsSync(localPath);
    }
    if (!differs) continue;

    changed.push(t.rel);
    if (CHECK_ONLY) {
      log(`  ✗ drift: ${t.rel}`);
      continue;
    }
    if (t.kind === 'dir') {
      // Replace the whole skill dir to pick up added/removed reference files.
      if (existsSync(localPath)) rmSync(localPath, { recursive: true, force: true });
      cpSync(upstreamPath, localPath, { recursive: true });
    } else {
      cpSync(upstreamPath, localPath);
    }
    log(`  ↻ synced: ${t.rel}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (changed.length === 0) {
  log('✓ All allowlisted skills are current with upstream.');
  process.exit(0);
}

if (CHECK_ONLY) {
  log(`\n${changed.length} path(s) drifted from upstream. Run without --check to sync.`);
  process.exit(1);
}

log(`\n✓ Synced ${changed.length} path(s) from upstream. Review the diff before committing.`);
process.exit(0);
