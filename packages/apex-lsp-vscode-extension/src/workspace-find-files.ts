/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';

/**
 * Schemes with a registered search provider that work with findFiles.
 * vscode-test-web registers a FileSearchProvider but it uses a lazy
 * in-memory cache that is empty until files are accessed — findFiles
 * always returns 0 for it in practice. Use walkDirectory instead.
 * memfs has no provider at all; anchoring RelativePattern to it stalls
 * the search service indefinitely.
 */
const SEARCH_PROVIDER_SCHEMES = new Set(['file', 'vscode-vfs']);

/**
 * Schemes whose filesystem provider supports workspace.fs APIs.
 * Used for the directory-traversal fallback when findFiles won't work.
 */
const FS_PROVIDER_SCHEMES = new Set(['vscode-test-web']);

/** Directories to skip during filesystem traversal. */
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.sfdx',
  '.sf',
  '.vscode',
  '.github',
  '.husky',
]);

/**
 * Convert the last segment of a glob pattern to a RegExp that matches
 * filenames. Handles literal names, * wildcards, and {a,b} alternatives.
 * Example: **\/GeocodingService*.cls -> /^GeocodingService[^/]*\.cls$/i
 */
function globSegmentToRegex(pattern: string): RegExp {
  const segment = pattern.split('/').pop() ?? pattern;
  const expanded = segment.replace(
    /\{([^}]+)\}/g,
    (_match: string, opts: string) => {
      const alternatives = opts
        .split(',')
        .map((o: string) => o.trim())
        .join('|');
      return '(' + alternatives + ')';
    },
  );
  const escaped = expanded.replace(/\./g, '\\.').replace(/\*/g, '[^/]*');
  return new RegExp('^' + escaped + '$', 'i');
}

/**
 * Recursively walk a directory using workspace.fs and collect files whose
 * names match the regex. Skips known non-source directories and stops once
 * maxResults is reached.
 */
async function walkDirectory(
  dirUri: vscode.Uri,
  matcher: RegExp,
  results: vscode.Uri[],
  maxResults: number,
  depth: number,
): Promise<void> {
  if (results.length >= maxResults || depth > 12) {
    return;
  }
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(dirUri);
  } catch {
    return; // directory not accessible — skip silently
  }
  const subdirs: vscode.Uri[] = [];
  for (const [name, type] of entries) {
    if (results.length >= maxResults) break;
    if (type === vscode.FileType.File) {
      if (matcher.test(name)) {
        results.push(vscode.Uri.joinPath(dirUri, name));
      }
    } else if (type === vscode.FileType.Directory && !SKIP_DIRS.has(name)) {
      subdirs.push(vscode.Uri.joinPath(dirUri, name));
    }
  }
  for (const sub of subdirs) {
    await walkDirectory(sub, matcher, results, maxResults, depth + 1);
  }
}

/**
 * Find files matching a glob pattern across all workspace folders, using
 * the appropriate strategy per scheme:
 *
 * - `file` / `vscode-vfs`: use vscode.workspace.findFiles with
 *   RelativePattern (these schemes have search providers).
 * - `vscode-test-web`: use workspace.fs.readDirectory traversal because
 *   the search provider's in-memory cache is lazy and returns 0 until
 *   files are accessed; direct fs traversal reads from the HTTP server.
 * - `memfs` and unknown schemes: skipped (no FS or search provider, or
 *   anchoring RelativePattern to memfs stalls the search service).
 */
export async function findFilesAcrossWorkspaceFolders(
  pattern: string,
  exclude?: string | null,
  maxResults: number = Infinity,
): Promise<vscode.Uri[]> {
  const allFolders = vscode.workspace.workspaceFolders ?? [];

  if (allFolders.length === 0) {
    return vscode.workspace.findFiles(pattern, exclude ?? null, maxResults);
  }

  const seen = new Set<string>();
  const results: vscode.Uri[] = [];

  // Pass 1: findFiles for schemes with a reliable search provider
  const searchFolders = allFolders.filter((f) =>
    SEARCH_PROVIDER_SCHEMES.has(f.uri.scheme),
  );
  for (const folder of searchFolders) {
    if (results.length >= maxResults) break;
    const remaining = maxResults - results.length;
    const relPattern = new vscode.RelativePattern(folder, pattern);
    try {
      const files = await vscode.workspace.findFiles(
        relPattern,
        exclude ?? null,
        remaining,
      );
      for (const f of files) {
        const key = f.toString();
        if (!seen.has(key)) {
          seen.add(key);
          results.push(f);
        }
      }
    } catch {
      // search failed for this folder — skip
    }
  }

  // Pass 2: fs.readDirectory traversal for schemes without a reliable search provider
  const fsFolders = allFolders.filter((f) =>
    FS_PROVIDER_SCHEMES.has(f.uri.scheme),
  );
  if (fsFolders.length > 0 && results.length < maxResults) {
    const matcher = globSegmentToRegex(pattern);
    for (const folder of fsFolders) {
      if (results.length >= maxResults) break;
      await walkDirectory(folder.uri, matcher, results, maxResults, 0);
    }
  }

  // Pass 3: fallback to bare findFiles if no known-scheme folders matched
  if (
    results.length === 0 &&
    searchFolders.length === 0 &&
    fsFolders.length === 0
  ) {
    return vscode.workspace.findFiles(pattern, exclude ?? null, maxResults);
  }

  return results;
}
