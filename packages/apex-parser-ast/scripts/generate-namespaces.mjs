/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path, { join } from 'node:path';

/**
 * Generate BUILT_IN_NAMESPACES constant from StandardApexLibrary directory structure
 */
async function generateNamespaces() {
  try {
    const standardApexLibraryPath = path.join(
      'src',
      'resources',
      'StandardApexLibrary',
    );

    // Read all directory names from StandardApexLibrary
    const entries = await readdir(standardApexLibraryPath, {
      withFileTypes: true,
    });
    const namespaceDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(); // Sort alphabetically for consistent output

    console.log(`Found ${namespaceDirectories.length} namespace directories:`);

    // Create the generated content
    const generatedContent = `/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file is auto-generated during build from StandardApexLibrary directory structure
// @ts-nocheck

/**
 * List of known Salesforce built-in namespaces
 * Generated from StandardApexLibrary directory structure
 */
export const BUILT_IN_NAMESPACES = [
${namespaceDirectories.map((namespace) => `  '${namespace}',`).join('\n')}
] as const;

/**
 * Type for built-in namespace names
 */
export type BuiltInNamespace = typeof BUILT_IN_NAMESPACES[number];

/**
 * Check if a string is a built-in namespace
 */
export const isBuiltInNamespace = (namespace: string): namespace is BuiltInNamespace => {
  return BUILT_IN_NAMESPACES.includes(namespace as BuiltInNamespace);
};
`;

    // Create generated directory if it doesn't exist
    await mkdir(path.join('src', 'generated'), { recursive: true });

    // Write the generated file
    const outputPath = path.join('src', 'generated', 'builtInNamespaces.ts');
    await writeFile(outputPath, generatedContent);

    console.log(
      `✅ Generated BUILT_IN_NAMESPACES constant with ${namespaceDirectories.length} namespaces`,
    );
    console.log(`📁 Output file: ${outputPath}`);

    return namespaceDirectories;
  } catch (error) {
    console.error('❌ Error generating namespaces:', error);
    process.exit(1);
  }
}

// Run the generation
generateNamespaces();
