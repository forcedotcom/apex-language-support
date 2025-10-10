/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path, { join } from 'node:path';
import { zipSync } from 'fflate';

// Function to recursively get all files in a directory
async function getAllFiles(dir, baseDir = dir) {
  const files = {};
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = fullPath.replace(baseDir, '').replace(/^[\/\\]/, '');

    if (entry.isDirectory()) {
      Object.assign(files, await getAllFiles(fullPath, baseDir));
    } else {
      const data = await readFile(fullPath);
      files[relativePath] = data;
    }
  }

  return files;
}

async function generateZip() {
  try {
    // Create generated directory for source files
    await mkdir(path.join('src', 'generated'), { recursive: true });
    // Create resources directory for distribution
    await mkdir(path.join('out', 'resources'), { recursive: true });

    // Clean up old zipLoader files
    const oldLoaderPaths = [
      path.join('src', 'generated', 'zipLoader.ts'),
      path.join('out', 'generated', 'zipLoader.js'),
      path.join('out', 'generated', 'zipLoader.d.ts'),
      path.join('out', 'generated', 'zipLoader.js.map'),
      path.join('src', 'generated', 'apexSrcLoader.ts'),
    ];

    for (const oldPath of oldLoaderPaths) {
      try {
        await unlink(oldPath);
        console.log(`Cleaned up old file: ${oldPath}`);
      } catch (error) {
        // Ignore errors if file doesn't exist
        if (error.code !== 'ENOENT') {
          console.error(`Error cleaning up ${oldPath}:`, error);
        }
      }
    }

    // Get all files from the StandardApexLibrary directory
    const files = await getAllFiles(
      path.join('src', 'resources', 'StandardApexLibrary'),
    );

    // Create a zip file
    const zipData = zipSync(files);

    // Write the zip file to both locations for maximum compatibility
    const outZipPath = path.join('out', 'resources', 'StandardApexLibrary.zip');
    const topLevelZipPath = path.join('resources', 'StandardApexLibrary.zip');

    // Ensure both directories exist
    await mkdir(path.dirname(outZipPath), { recursive: true });
    await mkdir(path.dirname(topLevelZipPath), { recursive: true });

    // Write to both locations
    await writeFile(outZipPath, zipData);
    await writeFile(topLevelZipPath, zipData);

    // Create CJS-compatible resource loader
    const cjsContent = `/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const path = require('path');
const fs = require('fs');

/**
 * Get the path to the ZIP resource file
 * Works in both Node.js CJS and ESM environments
 */
function getZipResourcePath() {
  try {
    // Try require.resolve first (works in CJS and some ESM environments)
    return require.resolve('../resources/StandardApexLibrary.zip');
  } catch (error) {
    // Try alternative paths
    const possiblePaths = [
      '../out/resources/StandardApexLibrary.zip',
      '../../out/resources/StandardApexLibrary.zip',
    ];
    
    for (const altPath of possiblePaths) {
      try {
        return require.resolve(altPath);
      } catch (altError) {
        // Continue to next path
      }
    }
    
    // Fallback to __dirname approach for CJS (only available in Node.js environments)
    if (typeof __dirname !== 'undefined') {
      return path.join(__dirname, '../resources/StandardApexLibrary.zip');
    }
    throw new Error('Unable to resolve ZIP resource path');
  }
}

/**
 * Load ZIP data synchronously
 */
function loadZipDataSync() {
  const zipPath = getZipResourcePath();
  return fs.readFileSync(zipPath);
}

/**
 * Load ZIP data asynchronously
 */
async function loadZipDataAsync() {
  const zipPath = getZipResourcePath();
  const { readFile } = await import('fs/promises');
  return readFile(zipPath);
}

module.exports = {
  getZipResourcePath,
  loadZipDataSync,
  loadZipDataAsync,
};
`;

    await writeFile(
      path.join('src', 'generated', 'zipResourceLoader.cjs'),
      cjsContent,
    );

    // Create ESM-compatible resource loader
    const esmContent = `/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Get the path to the ZIP resource file
 * Works in ESM environments
 */
function getZipResourcePath() {
  try {
    // Try import.meta.resolve if available (Node.js 20.6+)
    if (typeof import.meta.resolve === 'function') {
      return import.meta.resolve('../resources/StandardApexLibrary.zip');
    }
  } catch (error) {
    // Fallback to fileURLToPath approach
  }

  // Fallback to __dirname equivalent for ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '../resources/StandardApexLibrary.zip');
}

/**
 * Load ZIP data asynchronously
 */
export async function loadZipDataAsync() {
  const zipPath = getZipResourcePath();
  return readFile(zipPath);
}

export { getZipResourcePath };
`;

    await writeFile(
      path.join('src', 'generated', 'zipResourceLoader.mjs'),
      esmContent,
    );

    console.log(`Zip file created: ${outZipPath}`);
    console.log(`Zip file copied to: ${topLevelZipPath}`);
    console.log(`Zip file size: ${zipData.length} bytes`);
    console.log('Resource loaders created for CJS and ESM environments');
  } catch (error) {
    console.error('Error generating zip file:', error);
    process.exit(1);
  }
}

// Run the generation
generateZip();
