/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path, { join } from 'path';

import { defineConfig } from 'tsup';
import { zipSync } from 'fflate';

// Function to recursively get all files in a directory
async function getAllFiles(
  dir: string,
  baseDir: string = dir,
): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {};
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

// Create zip file before build
async function createZipFile() {
  // Create generated directory
  await mkdir(path.join('src', 'generated'), { recursive: true });

  // Get all files from the StandardApexLibrary directory
  const files = await getAllFiles(
    path.join('src', 'resources', 'StandardApexLibrary'),
  );

  // Create a zip file
  const zipData = zipSync(files);

  // Write the zip file to the generated directory
  const zipPath = path.join('src', 'generated', 'StandardApexLibrary.zip');
  await writeFile(zipPath, zipData);

  console.log('Resources zip file created successfully');
  console.log(`Zip file size: ${zipData.length} bytes`);
}

// Create zip file before export to ensure it exists for compilation
createZipFile().catch(console.error);

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@apexdevtools/apex-parser',
    '@salesforce/apex-lsp-logging',
    'antlr4ts',
    'data-structure-typed',
  ],
  esbuildOptions(options) {
    options.bundle = true;
    options.minify = false;
    options.target = 'node16';
    options.platform = 'node';
  },
  async onSuccess() {
    // Recreate zip file after successful build
    await createZipFile();
  },
});
