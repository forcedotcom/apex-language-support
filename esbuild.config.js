const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build(options = {}) {
  // Get the package directory from process.cwd()
  const packageDir = process.cwd();
  const packageName = path.basename(packageDir);
  console.log('Building package:', packageName);

  // Create bundle directory if it doesn't exist
  const bundleDir = path.join(packageDir, 'bundle');
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  // Find the main entry point
  const distIndexPath = path.join(packageDir, 'dist/index.js');
  const distCliPath = path.join(packageDir, 'dist/cli.js');

  let entryPoint;
  if (fs.existsSync(distIndexPath)) {
    entryPoint = distIndexPath;
    console.log('Using entry point:', distIndexPath);
  } else if (fs.existsSync(distCliPath)) {
    entryPoint = distCliPath;
    console.log('Using entry point:', distCliPath);
  } else {
    throw new Error(
      `No entry point found in ${packageDir}. Expected either dist/index.js or dist/cli.js`,
    );
  }

  const commonOptions = {
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    sourcemap: true,
    platform: 'node',
    target: 'node20',
    external: [
      // Common external dependencies
      'vscode-languageserver',
      'vscode-languageserver/browser',
      'vscode-languageserver/node',
      '@apexdevtools/apex-parser',
      'antlr4ts',
      // Internal dependencies
      '@salesforce/apex-lsp-logging',
      '@salesforce/apex-lsp-parser-ast',
      '@salesforce/apex-lsp-custom-services',
      '@salesforce/apex-lsp-compliant-services',
      '@salesforce/apex-ls-browser',
      '@salesforce/apex-ls-node',
      '@salesforce/apex-lsp-testbed',
      '@salesforce/apex-lsp-browser-client',
      '@salesforce/apex-lsp-vscode-client',
      '@salesforce/apex-lsp-vscode-extension',
    ],
    ...options,
  };

  console.log('Building CJS bundle...');
  await esbuild.build({
    ...commonOptions,
    format: 'cjs',
    outfile: path.join(bundleDir, 'index.js'),
  });

  console.log('Building ESM bundle...');
  await esbuild.build({
    ...commonOptions,
    format: 'esm',
    outfile: path.join(bundleDir, 'index.mjs'),
  });

  console.log('Build complete!');
}

module.exports = { build };
