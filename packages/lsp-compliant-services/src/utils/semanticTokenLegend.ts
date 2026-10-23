/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export const SEMANTIC_TOKEN_LEGEND = {
  tokenTypes: [
    'namespace',
    'class',
    'interface',
    'enum',
    'enumMember',
    'type',
    'parameter',
    'variable',
    'property',
    'method',
    'decorator',
    'keyword',
    'string',
    'number',
  ],
  tokenModifiers: [
    'declaration',
    'readonly',
    'static',
    'abstract',
    'deprecated',
    'modification',
    'defaultLibrary',
  ],
} as const;

export type SemanticTokenType =
  (typeof SEMANTIC_TOKEN_LEGEND.tokenTypes)[number];
export type SemanticTokenModifier =
  (typeof SEMANTIC_TOKEN_LEGEND.tokenModifiers)[number];
