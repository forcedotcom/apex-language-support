/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

/**
 * Generate primitive type constants from builtins/ directory and primitive-metadata.json
 * Single source of truth for primitive type resolution across the codebase
 */
async function generatePrimitiveTypes() {
  try {
    const builtinsDir = path.join(projectRoot, 'src', 'resources', 'builtins');
    const configPath = path.join(builtinsDir, 'primitive-metadata.json');

    // Read config
    const configText = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configText);
    const collections = new Set(
      (config.collections ?? []).map((s) => s.toLowerCase()),
    );
    const special = (config.special ?? []).map((s) => s.toLowerCase());
    const nonNullable = (config.nonNullable ?? []).map((s) => s.toLowerCase());
    const numeric = (config.numeric ?? []).map((s) => s.toLowerCase());

    // Read builtins
    const entries = await readdir(builtinsDir, { withFileTypes: true });
    const builtinNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.cls'))
      .map((entry) => entry.name.replace('.cls', '').toLowerCase())
      .sort();

    // Scalar primitives = builtins minus collections
    const scalarPrimitives = builtinNames.filter((n) => !collections.has(n));
    const allPrimitives = [...new Set([...scalarPrimitives, ...special])].sort();

    // Validate config
    const allPrimitivesSet = new Set(allPrimitives);
    for (const n of nonNullable) {
      if (!allPrimitivesSet.has(n)) {
        throw new Error(
          `nonNullable "${n}" is not in allPrimitives. Check primitive-metadata.json`,
        );
      }
    }
    const nonNullableSet = new Set(nonNullable);
    for (const n of numeric) {
      if (!nonNullableSet.has(n)) {
        throw new Error(
          `numeric "${n}" is not in nonNullable. Check primitive-metadata.json`,
        );
      }
    }

    const generatedContent = `/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file is auto-generated during build from builtins/ and primitive-metadata.json
// DO NOT EDIT - This file is generated automatically

/**
 * Canonical list of all Apex primitive types (lowercase)
 * Generated from builtins/ (excluding collections) + special types (void, null)
 */
export const APEX_PRIMITIVE_TYPES_ARRAY = [
${allPrimitives.map((t) => `  '${t}',`).join('\n')}
] as const;

/**
 * Set of Apex primitive types for O(1) lookups
 * All type names are stored in lowercase for case-insensitive matching
 */
export const APEX_PRIMITIVE_TYPES = new Set<string>(APEX_PRIMITIVE_TYPES_ARRAY);

/**
 * Non-nullable primitives - null is not compatible with these
 */
export const NON_NULLABLE_PRIMITIVES_ARRAY = [
${nonNullable.map((t) => `  '${t}',`).join('\n')}
] as const;

/**
 * Set of non-nullable primitive types
 */
export const NON_NULLABLE_PRIMITIVES = new Set<string>(
  NON_NULLABLE_PRIMITIVES_ARRAY,
);

/**
 * Numeric types that support widening promotion
 */
export const NUMERIC_TYPES = [
${numeric.map((t) => `  '${t}',`).join('\n')}
] as const;

/** Types invalid as instanceof RHS - primitives except Object (x instanceof Object is valid) */
export const INSTANCEOF_PRIMITIVE_TYPES = new Set(
  [...APEX_PRIMITIVE_TYPES].filter((t) => t !== 'object'),
);

/**
 * Check if type name is an Apex primitive type (case-insensitive)
 */
export function isPrimitiveType(typeName: string): boolean {
  return APEX_PRIMITIVE_TYPES.has((typeName ?? '').trim().toLowerCase());
}

/**
 * Check if type name is a non-nullable primitive type (case-insensitive)
 */
export function isNonNullablePrimitiveType(typeName: string): boolean {
  return NON_NULLABLE_PRIMITIVES.has((typeName ?? '').trim().toLowerCase());
}

/**
 * Check if type name is an Apex numeric type (case-insensitive)
 */
export function isNumericType(typeName: string): boolean {
  return (NUMERIC_TYPES as readonly string[]).includes(
    (typeName ?? '').trim().toLowerCase(),
  );
}
`;

    await mkdir(path.join(projectRoot, 'src', 'generated'), { recursive: true });
    const outputPath = path.join(projectRoot, 'src', 'generated', 'primitiveTypes.ts');
    await writeFile(outputPath, generatedContent);

    console.log(
      `✅ Generated primitive types: ${allPrimitives.length} primitives, ${nonNullable.length} non-nullable, ${numeric.length} numeric`,
    );
    console.log(`📁 Output file: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating primitive types:', error);
    process.exit(1);
  }
}

generatePrimitiveTypes();
