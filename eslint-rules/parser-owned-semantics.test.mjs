/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { Linter } from 'eslint';
import localRules from './index.mjs';

const verify = (source) => {
  const linter = new Linter();
  return linter.verify(source, [
    {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      plugins: { local: localRules },
      rules: { 'local/parser-owned-semantics': 'error' },
    },
  ]);
};

test('rejects semantic interpretation of composite parser-context text', () => {
  const messages = verify("const parts = ctx.getText().split('.');");

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['compositeText'],
  );
});

test('rejects fabricated semantic placeholders', () => {
  const messages = verify("const name = 'unknownMethod';");

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['placeholder'],
  );
});

test('rejects source-text semantic recovery helpers', () => {
  const messages = verify(
    'class Listener { recoverDeclaredTypeFromSource() {} }',
  );

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['fallbackHelper'],
  );
});

test('rejects direct interpretation of raw Apex source', () => {
  const messages = verify(`
    const lines = options.sourceContent.split('\\n');
    const normalized = lines.trim();
  `);

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['rawSource', 'rawSource'],
  );
});

test('rejects interpretation of raw document text', () => {
  const messages = verify(`
    const lines = document.getText().split('\\n');
    const normalized = textDocument.getText().trim();
  `);

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['rawSource', 'rawSource'],
  );
});

test('tracks composite parser text through a lexical alias', () => {
  const messages = verify(`
    function inspect(ctx) {
      const expressionText = ctx.getText();
      return expressionText.includes('insert');
    }
  `);

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['compositeText'],
  );
});

test('rejects interpretation of expression-context text through an alias', () => {
  const messages = verify(`
    function inspect(ctx) {
      const expressionText = ctx.expression().getText() || '';
      return expressionText.startsWith('new ');
    }
  `);

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['compositeText'],
  );
});

test('rejects regex and equality interpretation of expression-context text', () => {
  const messages = verify(`
    function inspect(ctx) {
      const expressionText = ctx.expression().getText() || '';
      return /^\\d+$/.test(expressionText) || expressionText === 'true';
    }
  `);

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['compositeText', 'compositeText'],
  );
});

test('rejects interpretation of typeRef and creator context text', () => {
  const messages = verify(`
    const normalizedType = ctx.typeRef()?.getText().toLowerCase();
    const creatorParts = ctx.creator()?.getText().split('.');
  `);

  assert.deepEqual(
    messages.map(({ messageId }) => messageId),
    ['compositeText', 'compositeText'],
  );
});

test('allows parser terminal text access', () => {
  const messages = verify(`
    const name = ctx.id().getText();
    const value = ctx.BooleanLiteral().getText().toLowerCase();
    const qualifiedName = ctx.anyId().getText().split('.');
    const stringValue = ctx.StringLiteral().getText().slice(1, -1);
    const identifierNode = ctx.id();
    const identifier = identifierNode.getText().toLowerCase();
    const literalNode = ctx.StringLiteral();
    const unquoted = literalNode.getText().slice(1, -1);
  `);

  assert.deepEqual(messages, []);
});

test('allows semantic type values named source and sourceType', () => {
  const messages = verify(`
    function isAssignable(source, sourceType) {
      const sourceName = source.name.toLowerCase();
      return sourceType.trim() === sourceName;
    }
  `);

  assert.deepEqual(messages, []);
});

test('allows CharStream text reads for indentation and ranges', () => {
  const messages = verify(`
    function readRange(stream, lineStart, index) {
      const char = stream.getText(index, index);
      return stream.getText(lineStart, index - 1).length + char.length;
    }
  `);

  assert.deepEqual(messages, []);
});

test('allows terminal text length for symbol range mechanics', () => {
  const messages = verify(`
    function endColumn(ctx, token) {
      if (ctx.symbol) {
        const text = ctx.getText() || token.text || '';
        return token.column + text.length;
      }
      return token.column;
    }
  `);

  assert.deepEqual(messages, []);
});
