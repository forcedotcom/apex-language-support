#!/usr/bin/env tsx

/**
 * Extension Publish Matrix Script
 *
 * This script determines the publish matrix for VS Code extensions,
 * creating entries for each extension-registry combination.
 */

// eslint-disable-next-line header/header
import { Command } from 'commander';

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

  return matrix;
}

// Export for use in other modules
export { determinePublishMatrix };

function setMatrixOutput(matrix: PublishMatrixEntry[]): void {
  const matrixJson = JSON.stringify(matrix);
  console.log(`matrix=${matrixJson}`);

  // Also log for debugging
  console.log('Publish matrix:', matrixJson);
}

const program = new Command();

program
  .name('ext-publish-matrix')
  .description('Determine publish matrix for extensions')
  .option('--registries <list>', 'Registries to publish to', 'all')
  .option(
    '--selected-extensions <list>',
    'Comma-separated list of extensions to release',
    '',
  )
  .action((options) => {
    const matrix = determinePublishMatrix(options);
    setMatrixOutput(matrix);
  });

program.parse();
