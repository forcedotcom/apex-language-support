/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import header from '@tony.ganchev/eslint-plugin-header';
import typescriptParser from '@typescript-eslint/parser';
import localRules from './eslint-rules/index.mjs';
import jsoncParser from 'jsonc-eslint-parser';

export default [
  {
    // Global configuration that ensures package.json files are always included
    ignores: [
      '**/.turbo/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/.DS_Store',
      '**/server-bundle/**',
    ],
    files: ['**/*.ts', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parser: typescriptParser,
      globals: {
        // Add any global variables here if needed
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      header: header,
      prettier: prettierPlugin,
      import: importPlugin,
      'unused-imports': unusedImportsPlugin,
      jsdoc: jsdocPlugin,
      local: localRules,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['off'],
      'arrow-body-style': ['error', 'as-needed'],
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-indentation': 'warn',
      'header/header': [
        'error',
        'block',
        [
          '',
          {
            pattern: ' \\* Copyright \\(c\\) \\d{4}, salesforce\\.com, inc\\.',
            template: ' * Copyright (c) 2025, salesforce.com, inc.',
          },
          ' * All rights reserved.',
          ' * Licensed under the BSD 3-Clause license.',
          ' * For full license text, see LICENSE.txt file in the',
          ' * repo root or https://opensource.org/licenses/BSD-3-Clause',
          ' ',
        ],
      ],
      quotes: ['error', 'single', { avoidEscape: true }],
      'unused-imports/no-unused-imports': 'error',
      // 'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/no-duplicates': 'error',
      'max-len': ['error', { code: 120 }],
    },
  },
  {
    // Override for package.json files to use JSONC parser and turbo rules
    files: ['**/package.json'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      local: localRules,
    },
    rules: {
      'local/turbo-circular-dependency': 'error',
      'local/turbo-unfiltered-usage': 'warn',
    },
  },
];
