#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Post-bundle script to copy worker and server files from apex-ls
 * This runs as a separate npm script so Wireit can properly track dependencies
 */

const fs = require('fs');
const path = require('path');

/**
 * Copy worker and server files from apex-ls dist to extension dist
 * Wireit dependency management ensures @salesforce/apex-ls:bundle completes before this runs
 */
function copyWorkerFiles() {
  const distDir = path.resolve(__dirname, '../dist');
  fs.mkdirSync(distDir, { recursive: true });

  const workerFiles = [
    {
      src: '../../apex-ls/dist/worker.global.js',
      dest: 'worker.global.js',
    },
    {
      src: '../../apex-ls/dist/worker.global.js.map',
      dest: 'worker.global.js.map',
    },
    {
      src: '../../apex-ls/dist/server.node.js',
      dest: 'server.node.js',
    },
    {
      src: '../../apex-ls/dist/server.node.js.map',
      dest: 'server.node.js.map',
    },
  ];

  let allFilesCopied = true;
  for (const { src, dest } of workerFiles) {
    const srcPath = path.resolve(__dirname, src);
    const destPath = path.join(distDir, dest);
    try {
      if (!fs.existsSync(srcPath)) {
        console.error(`❌ Source file does not exist: ${srcPath}`);
        console.error(
          '   Wireit dependency violation: @salesforce/apex-ls:bundle should complete before copy-worker-files runs.',
        );
        allFilesCopied = false;
        continue;
      }

      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${dest}`);
    } catch (error) {
      console.error(`❌ Failed to copy ${dest}:`, error.message);
      allFilesCopied = false;
    }
  }

  if (!allFilesCopied) {
    console.error('\n❌ Some worker/server files could not be copied.');
    console.error('   This indicates a Wireit dependency configuration issue.');
    process.exit(1);
  }

  console.log('✅ All worker/server files copied successfully');
}

/**
 * Create a minimal .vscodeignore in dist that ensures worker and server files are included
 * Using an empty file to include everything by default
 */
function createVscodeIgnore() {
  const distDir = path.resolve(__dirname, '../dist');
  const vscodeignorePath = path.join(distDir, '.vscodeignore');
  // Empty .vscodeignore means include everything in the dist directory
  const vscodeignoreContent = `# Include all files - no exclusions
`;

  try {
    fs.writeFileSync(vscodeignorePath, vscodeignoreContent);
    console.log('✅ Created .vscodeignore in dist');
  } catch (error) {
    console.warn('⚠️ Failed to create .vscodeignore:', error.message);
  }
}

// Run the copy operation
try {
  copyWorkerFiles();
  createVscodeIgnore();
} catch (error) {
  console.error('❌ Copy-worker-files script failed:', error);
  process.exit(1);
}
