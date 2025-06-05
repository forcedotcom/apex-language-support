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
    await mkdir(path.join('dist', 'resources'), { recursive: true });

    // Clean up old zipLoader files
    const oldLoaderPaths = [
      path.join('src', 'generated', 'zipLoader.ts'),
      path.join('dist', 'generated', 'zipLoader.js'),
      path.join('dist', 'generated', 'zipLoader.d.ts'),
      path.join('dist', 'generated', 'zipLoader.js.map'),
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

    // Write the zip file to both locations
    const srcZipPath = path.join('src', 'generated', 'StandardApexLibrary.zip');
    const distZipPath = path.join(
      'dist',
      'resources',
      'StandardApexLibrary.zip',
    );

    await writeFile(srcZipPath, zipData);
    await writeFile(distZipPath, zipData);

    // Create the zipLoader.ts file with the base64-encoded zip data
    const base64Data = Buffer.from(zipData).toString('base64');
    const zipLoaderContent = `/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file is auto-generated during build
// @ts-nocheck
export const zipData = Buffer.from('${base64Data}', 'base64');
`;
    await writeFile(
      path.join('src', 'generated', 'apexSrcLoader.ts'),
      zipLoaderContent,
    );

    console.log(
      'Resources zip file created successfully in src/generated and dist/resources',
    );
    console.log(`Zip file size: ${zipData.length} bytes`);
  } catch (error) {
    console.error('Error generating zip file:', error);
    process.exit(1);
  }
}

// Run the generation
generateZip();
