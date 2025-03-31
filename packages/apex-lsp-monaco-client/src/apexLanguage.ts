/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as monaco from 'monaco-editor';

/**
 * Register the Apex language with Monaco editor
 */
export function registerApexLanguage() {
  // Register Apex as a language
  monaco.languages.register({ id: 'apex' });

  // Define tokenizer for syntax highlighting
  monaco.languages.setMonarchTokensProvider('apex', {
    defaultToken: 'invalid',
    tokenPostfix: '.apex',

    keywords: [
      'abstract',
      'activate',
      'and',
      'any',
      'array',
      'as',
      'asc',
      'autonomous',
      'begin',
      'bigdecimal',
      'blob',
      'boolean',
      'break',
      'bulk',
      'by',
      'byte',
      'case',
      'cast',
      'catch',
      'char',
      'class',
      'collect',
      'commit',
      'const',
      'continue',
      'currency',
      'date',
      'datetime',
      'decimal',
      'default',
      'delete',
      'desc',
      'do',
      'double',
      'else',
      'end',
      'enum',
      'exception',
      'exit',
      'export',
      'extends',
      'false',
      'final',
      'finally',
      'float',
      'for',
      'from',
      'future',
      'global',
      'goto',
      'group',
      'having',
      'hint',
      'if',
      'implements',
      'import',
      'in',
      'inner',
      'insert',
      'instanceof',
      'interface',
      'into',
      'int',
      'join',
      'like',
      'limit',
      'list',
      'long',
      'loop',
      'map',
      'merge',
      'new',
      'not',
      'null',
      'nulls',
      'number',
      'object',
      'of',
      'on',
      'or',
      'outer',
      'override',
      'package',
      'parallel',
      'pragma',
      'private',
      'protected',
      'public',
      'retrieve',
      'return',
      'rollback',
      'select',
      'set',
      'short',
      'sObject',
      'sort',
      'static',
      'string',
      'super',
      'switch',
      'synchronized',
      'system',
      'testmethod',
      'then',
      'this',
      'throw',
      'time',
      'transaction',
      'trigger',
      'true',
      'try',
      'undelete',
      'update',
      'upsert',
      'using',
      'virtual',
      'void',
      'webservice',
      'when',
      'where',
      'while',
      'with',
      'without',
    ],

    operators: [
      '=',
      '>',
      '<',
      '!',
      '~',
      '?',
      ':',
      '==',
      '<=',
      '>=',
      '!=',
      '&&',
      '||',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '&',
      '|',
      '^',
      '%',
      '+=',
      '-=',
      '*=',
      '/=',
      '&=',
      '|=',
      '^=',
      '%=',
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    escapes:
      /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    // The main tokenizer for Apex language
    tokenizer: {
      root: [
        // Identifiers and keywords
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],

        // Whitespace
        { include: '@whitespace' },

        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          },
        ],

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],

        // Strings
        [/'([^'\\]|\\.)*$/, 'string.invalid'], // single quote string
        [/'/, { token: 'string.quote', bracket: '@open', next: '@string' }],

        // Characters
        [/'[^\\']'/, 'string'],
        [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
        [/'/, 'string.invalid'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'], // nested comment
        ['\\*/', 'comment', '@pop'],
        [/[\/*]/, 'comment'],
      ],

      string: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
    },
  });

  // Define language configuration
  monaco.languages.setLanguageConfiguration('apex', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*//\\s*#?region\\b'),
        end: new RegExp('^\\s*//\\s*#?endregion\\b'),
      },
    },
  });
}
