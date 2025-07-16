#!/usr/bin/env tsx
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { log } from './utils';

interface PublishMatrixEntry {
  registry: string;
  vsix_pattern: string;
  marketplace: string;
}

interface PublishMatrixOptions {
  registries: string;
  selectedExtensions: string;
}

function getVsixPattern(extension: string): string {
  switch (extension) {
    case 'apex-lsp-vscode-extension':
      return '*apex-language-server-extension*.vsix';
    case 'apex-lsp-vscode-extension-web':
      return '*apex-language-server-extension-web*.vsix';
    default:
      return `*${extension}*.vsix`;
  }
}

function getMarketplaceName(registry: string): string {
  switch (registry) {
    case 'vsce':
      return 'VS Code Marketplace';
    case 'ovsx':
      return 'Open VSX Registry';
    default:
      return registry;
  }
}

function determinePublishMatrix(
  options: PublishMatrixOptions,
): PublishMatrixEntry[] {
  const { registries, selectedExtensions } = options;

  // Handle empty or undefined selectedExtensions
  if (!selectedExtensions || selectedExtensions.trim() === '') {
    log.info('No extensions selected for publishing, returning empty matrix');
    return [];
  }

  // Determine which registries to include
  const registryList =
    registries === 'all'
      ? ['vsce', 'ovsx']
      : registries.split(',').filter(Boolean);

  // Create matrix entries for each extension-registry combination
  const extensions = selectedExtensions.split(',').filter(Boolean);
  const matrix: PublishMatrixEntry[] = [];

  for (const ext of extensions) {
    if (!ext) continue;

    const vsixPattern = getVsixPattern(ext);

    for (const registry of registryList) {
      const marketplace = getMarketplaceName(registry);

      matrix.push({
        registry,
        vsix_pattern: vsixPattern,
        marketplace,
      });
    }
  }
  log.info(`Publish matrix: ${JSON.stringify(matrix, null, 2)}`);
  return matrix;
}

// Export for use in other modules
export { determinePublishMatrix };
