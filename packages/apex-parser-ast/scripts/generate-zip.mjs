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

    // Create TypeScript resource loader that works in both Node.js and browser environments
    const tsContent = `/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Conditional imports to avoid bundling issues in browser environments
let readFile: any = null;
let fileURLToPath: any = null;
let path: any = null;

// Only import Node.js modules in Node.js environments
if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    readFile = require('fs/promises').readFile;
    fileURLToPath = require('url').fileURLToPath;
    path = require('path');
  } catch (error) {
    // Fallback for environments where require doesn't work
  }
}

/**
 * Get the path to the ZIP resource file
 * Works in both Node.js and browser environments
 */
function getZipResourcePath(): string {
  // Check if we're in a Node.js environment
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      // Try require.resolve first (works in CJS and some ESM environments)
      if (typeof require !== 'undefined' && require.resolve) {
        return require.resolve('../resources/StandardApexLibrary.zip');
      }
    } catch (error) {
      // Fallback to other methods
    }

    // Try alternative paths for Node.js
    const possiblePaths = [
      '../out/resources/StandardApexLibrary.zip',
      '../../out/resources/StandardApexLibrary.zip',
    ];
    
    for (const altPath of possiblePaths) {
      try {
        if (typeof require !== 'undefined' && require.resolve) {
          return require.resolve(altPath);
        }
      } catch (altError) {
        // Continue to next path
      }
    }
    
    // Fallback to __dirname approach for CJS
    if (typeof __dirname !== 'undefined') {
      return path.join(__dirname, '../resources/StandardApexLibrary.zip');
    }

    // Note: import.meta usage removed due to TypeScript compilation issues
    // ESM environments will fall back to browser path resolution
  }

  // Browser environment fallback
  return './resources/StandardApexLibrary.zip';
}

/**
 * Load ZIP data synchronously
 * Note: This will only work in Node.js environments
 */
export function loadZipDataSync(): Buffer {
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('loadZipDataSync is only available in Node.js environments');
  }

  const fs = require('fs');
  const zipPath = getZipResourcePath();
  return fs.readFileSync(zipPath);
}

/**
 * Load ZIP data asynchronously
 * Works in both Node.js and browser environments
 */
export async function loadZipDataAsync(): Promise<Buffer | ArrayBuffer> {
  // Check if we're in a Node.js environment
  if (typeof process !== 'undefined' && process.versions?.node && readFile) {
    const zipPath = getZipResourcePath();
    return readFile(zipPath);
  }

  // Browser environment - try to load via fetch
  const zipPath = getZipResourcePath();
  const response = await fetch(zipPath);
  if (!response.ok) {
    throw new Error(\`Failed to load ZIP resource: \${response.status} \${response.statusText}\`);
  }
  return response.arrayBuffer();
}

export { getZipResourcePath };
`;

    await writeFile(
      path.join('src', 'generated', 'zipResourceLoader.ts'),
      tsContent,
    );

    console.log(`Zip file created: ${outZipPath}`);
    console.log(`Zip file copied to: ${topLevelZipPath}`);
    console.log(`Zip file size: ${zipData.length} bytes`);
    console.log(
      'TypeScript resource loader created for Node.js and browser environments',
    );
  } catch (error) {
    console.error('Error generating zip file:', error);
    process.exit(1);
  }
}

// Run the generation
generateZip();
