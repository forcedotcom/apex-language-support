/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const typescriptEslintPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const importPlugin = require('eslint-plugin-import');
const unusedImportsPlugin = require('eslint-plugin-unused-imports');
const jsdocPlugin = require('eslint-plugin-jsdoc');
const header = require('@tony.ganchev/eslint-plugin-header');
const typescriptParser = require('@typescript-eslint/parser');
const localRules = require('./eslint-rules');
const jsoncParser = require('jsonc-eslint-parser');

module.exports = [
  {
    // Global configuration that ensures package.json files are always included
    ignores: ['**/.wireit/**', '**/dist/**', '**/node_modules/**', '**/*.d.ts'],
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
