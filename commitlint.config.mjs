/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'apex-lsp-parser-ast',
        'apex-lsp-custom-services',
        'apex-lsp-compliant-services',
        'apex-lsp-extension',
        'apex-lsp-web',
        'docs',
        'infra',
        'build',
        'ci',
        'deps',
        'repo',
      ],
    ],
    'body-max-line-length': [2, 'always', 100],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
  },
};
