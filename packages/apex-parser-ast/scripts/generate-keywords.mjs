/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Generate APEX_KEYWORDS constant from ApexLexer vocabulary
 * Also generates BUILTIN_TYPE_NAMES from src/resources/builtins/ directory
 * Extracts all keywords from the lexer at build time for future-proofing
 */
async function generateKeywords() {
  try {
    // Dynamic import to avoid bundling issues
    const { ApexLexer } = await import('@apexdevtools/apex-parser');
    const { CharStreams } = await import('antlr4ts');

    // Create lexer instance to access vocabulary
    const lexer = new ApexLexer(CharStreams.fromString(''));
    const vocab = lexer.vocabulary;

    // Tokens to exclude (operators, punctuation, special tokens)
    const excludePatterns = [
      /^(LPAREN|RPAREN|LBRACE|RBRACE|SEMI|COMMA|DOT|PLUS|MINUS|STAR|SLASH|EQ|LT|GT|BANG|TILDE|QUESTION|COLON|AT)$/,
      /^(WS|COMMENT|STRING|CHAR|NUMBER|ID|EOF)$/,
      /^T__/, // Template tokens
      /^(LBrack|RBrack|Assign|TripleEqual|NotEqual|LessAndGreater|TripleNotEqual|And|Or|Coal|Inc|Dec|Add|Sub|Mul|Div|BitAnd|BitOr|Caret|MapTo|Add_Assign|Sub_Assign|Mul_Assign|Div_Assign|And_Assign|Or_Assign|Xor_Assign|LShift_Assign|RShift_Assign|URShift_Assign)$/,
      /^(Doc_Comment|Line_Comment)$/, // Comment tokens (not keywords)
    ];

    // Extract keywords
    const keywords = [];
    for (let i = 0; i <= vocab.maxTokenType; i++) {
      const symbolicName = vocab.getSymbolicName(i);
      if (symbolicName) {
        // Check if it's a keyword (uppercase token name that's not excluded)
        const isExcluded = excludePatterns.some((pattern) =>
          pattern.test(symbolicName),
        );
        if (!isExcluded && symbolicName.match(/^[A-Z_]+$/)) {
          const displayName = vocab.getDisplayName(i);
          // Display name is quoted (e.g., "'abstract'"), strip quotes
          let keyword = null;
          if (
            displayName &&
            displayName.startsWith("'") &&
            displayName.endsWith("'")
          ) {
            keyword = displayName.slice(1, -1).toLowerCase();
          } else if (displayName && displayName !== symbolicName) {
            keyword = displayName.toLowerCase();
          } else {
            // Fallback: convert symbolic name to lowercase
            keyword = symbolicName.toLowerCase();
          }

          // Only include if it's a valid identifier (letters, numbers, underscores)
          // and not an operator/punctuation (exclude single chars and special chars)
          if (
            keyword &&
            keyword.match(/^[a-z_][a-z0-9_]*$/) &&
            keyword.length > 1
          ) {
            keywords.push(keyword);
          }
        }
      }
    }

    // Remove duplicates and sort
    const uniqueKeywords = [...new Set(keywords)].sort();

    console.log(`Found ${uniqueKeywords.length} Apex keywords`);

    // Extract builtin type names from src/resources/builtins/ directory
    const builtinsDir = path.join('src', 'resources', 'builtins');
    let builtinTypeNames = [];
    try {
      const entries = await readdir(builtinsDir, { withFileTypes: true });
      builtinTypeNames = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.cls'))
        .map((entry) => entry.name.replace('.cls', '').toLowerCase())
        .sort();
      console.log(`Found ${builtinTypeNames.length} builtin type names`);
    } catch (error) {
      console.warn(
        `⚠️  Warning: Could not read builtins directory: ${error.message}`,
      );
      console.warn('Continuing without builtin type names...');
    }

    // Create the generated content
    const generatedContent = `/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file is auto-generated during build from ApexLexer vocabulary
// @ts-nocheck
// DO NOT EDIT - This file is generated automatically

/**
 * Comprehensive set of all Apex keywords extracted from the lexer grammar
 * Generated at build time from @apexdevtools/apex-parser ApexLexer vocabulary
 * This ensures the keyword list automatically stays in sync with parser updates
 */
export const APEX_KEYWORDS_ARRAY = [
${uniqueKeywords.map((keyword) => `  '${keyword}',`).join('\n')}
] as const;

/**
 * Set of Apex keywords for fast O(1) lookups
 * All keywords are stored in lowercase for case-insensitive matching
 */
export const APEX_KEYWORDS = new Set<string>(APEX_KEYWORDS_ARRAY);

/**
 * Built-in Apex type names extracted from src/resources/builtins/ directory
 * These are concrete stub implementations of foundational Apex language classes
 * Generated at build time to ensure consistency with actual builtin classes
 * These types are also keywords but should be resolvable as types, not short-circuited
 */
export const BUILTIN_TYPE_NAMES_ARRAY = [
${builtinTypeNames.map((typeName) => `  '${typeName}',`).join('\n')}
] as const;

/**
 * Set of built-in type names for fast O(1) lookups
 * All type names are stored in lowercase for case-insensitive matching
 */
export const BUILTIN_TYPE_NAMES = new Set<string>(BUILTIN_TYPE_NAMES_ARRAY);

/**
 * Check if a string is an Apex keyword (case-insensitive)
 * @param name The name to check
 * @returns true if the name is an Apex keyword, false otherwise
 */
export function isApexKeyword(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return APEX_KEYWORDS.has(name.toLowerCase());
}
`;

    // Create generated directory if it doesn't exist
    await mkdir(path.join('src', 'generated'), { recursive: true });

    // Write the generated file
    const outputPath = path.join('src', 'generated', 'apexKeywords.ts');
    await writeFile(outputPath, generatedContent);

    console.log(
      `✅ Generated APEX_KEYWORDS constant with ${uniqueKeywords.length} keywords`,
    );
    console.log(
      `✅ Generated BUILTIN_TYPE_NAMES constant with ${builtinTypeNames.length} builtin types`,
    );
    console.log(`📁 Output file: ${outputPath}`);

    return uniqueKeywords;
  } catch (error) {
    console.error('❌ Error generating keywords:', error);
    process.exit(1);
  }
}

// Run the generation
generateKeywords();
