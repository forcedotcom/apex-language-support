/*
 * Copyright (c) 2026, salesforce.com, inc.
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
    // Global ignores (applied to all file types)
    ignores: [
      '**/.wireit/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/.DS_Store',
      '**/server-bundle/**',
      '**/test-artifacts/**',
      '**/src/generated/**',
      '**/test/fixtures/eda/**',
    ],
  },
  {
    // TypeScript and module files configuration
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'arrow-body-style': ['error', 'as-needed'],
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-indentation': 'off',
      'header/header': [
        'error',
        'block',
        [
          '',
          {
            pattern: ' \\* Copyright \\(c\\) \\d{4}, salesforce\\.com, inc\\.',
            template: ' * Copyright (c) 2026, salesforce.com, inc.',
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@effect/platform',
              message:
                'Import from a submodule (e.g. @effect/platform/FetchHttpClient) instead of the barrel. ' +
                'The barrel pulls in HttpApiSwagger (Swagger UI), which esbuild cannot tree-shake — ' +
                'it bloats bundles ~5.5MB and trips ClamAV scanners. See BUNDLE_SIZE_ANALYSIS.md.',
            },
          ],
        },
      ],
    },
  },
  {
    // Override for package.json files to use JSONC parser
    files: ['**/package.json'],
    languageOptions: {
      parser: jsoncParser,
    },
  },
  {
    files: ['packages/apex-parser-ast/src/parser/listeners/**/*.ts'],
    rules: {
      'local/parser-owned-semantics': 'error',
    },
  },
  {
    files: [
      'packages/apex-parser-ast/src/semantics/validation/ConstructorExpressionValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/ExpressionValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/TypeCastingValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/CollectionValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/ConstructorValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/DmlStatementValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/DmlLoopQueryValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/DuplicateFieldInitValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/ExceptionValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/ExpressionTypeValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/ExpressionValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/InnerTypeValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/InstanceofValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/LiteralValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/MethodResolutionValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/ModifierValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/ParameterizedTypeValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/ReturnStatementValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/RunAsStatementValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/SourceSizeValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/StaticContextValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/SwitchStatementValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/validators/VariableResolutionValidator.ts',
      'packages/apex-parser-ast/src/semantics/validation/VariableExpressionValidator.ts',
      'packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts',
      'packages/apex-parser-ast/src/symbols/ops/resolutionContext.ts',
      'packages/apex-parser-ast/src/utils/methodCallAtRange.ts',
      'packages/lsp-compliant-services/src/documentSymbol/ApexDocumentSymbolProvider.ts',
      'packages/lsp-compliant-services/src/services/CodeActionProcessingService.ts',
    ],
    rules: {
      'local/parser-owned-semantics': 'error',
    },
  },
  {
    // e2e-tests: import plugin cannot resolve @playwright/test re-exports (Page, Locator, etc.)
    files: ['e2e-tests/**/*.ts'],
    rules: {
      'import/named': 'off',
    },
  },
];
