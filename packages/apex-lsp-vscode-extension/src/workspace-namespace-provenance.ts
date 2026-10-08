/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

type NamespaceRoot = {
  readonly root: vscode.Uri;
  readonly namespace: string;
};

const asNamespace = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const isWithin = (uri: vscode.Uri, root: vscode.Uri): boolean => {
  const path = uri.path;
  const rootPath = root.path.endsWith('/') ? root.path : `${root.path}/`;
  return path === root.path || path.startsWith(rootPath);
};

const readManifestNamespace = async (
  uri: vscode.Uri,
): Promise<string | undefined> => {
  try {
    const content = new TextDecoder().decode(
      await vscode.workspace.fs.readFile(uri),
    );
    return asNamespace(
      (JSON.parse(content) as { namespace?: unknown }).namespace,
    );
  } catch {
    return undefined;
  }
};

/**
 * Reads namespace declarations from workspace project manifests once per load.
 * Namespace is persisted as source provenance; it is never inferred from paths.
 */
export async function loadWorkspaceNamespaceRoots(): Promise<
  readonly NamespaceRoot[]
> {
  const roots: NamespaceRoot[] = [];
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const projectManifest = vscode.Uri.joinPath(
      folder.uri,
      'sfdx-project.json',
    );
    const projectNamespace = await readManifestNamespace(projectManifest);
    if (projectNamespace) {
      roots.push({ root: folder.uri, namespace: projectNamespace });
    }
  }
  return roots;
}

/** Return the namespace declared by the workspace root containing uri. */
export function namespaceForUri(
  uri: vscode.Uri,
  roots: readonly NamespaceRoot[],
): string | undefined {
  return roots
    .filter((candidate) => isWithin(uri, candidate.root))
    .sort((left, right) => right.root.path.length - left.root.path.length)[0]
    ?.namespace;
}
