/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import { CompilerService } from '../../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../../src/parser/listeners/ApexSymbolCollectorListener';

const FIXTURES_ROOT = path.join(__dirname, '../../fixtures/validation');

function loadFixture(category: string, filename: string): string {
  return fs.readFileSync(
    path.join(FIXTURES_ROOT, category, filename),
    'utf8',
  );
}

describe('Contextual Keyword Identifier', () => {
  const compilerService = new CompilerService();

  describe('correct context - contextual keywords as variables', () => {
    it('should NOT report invalid.keyword.identifier for offset, limit, select, count as variable names', () => {
      const content = loadFixture(
        'contextual-keyword-identifier',
        'ContextualKeywordAsVariable.cls',
      );
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(content, 'test.cls', listener, {
        collectReferences: true,
        resolveReferences: true,
      });

      const keywordErrors = (result.errors || []).filter(
        (e) =>
          e.message?.includes('Identifier cannot be a keyword') ||
          e.message?.toLowerCase().includes('keyword'),
      );

      expect(keywordErrors).toHaveLength(0);
    });
  });

  describe('incorrect context - non-contextual keyword as variable', () => {
    it('should report error for "if" as variable name', () => {
      const content = loadFixture(
        'invalid-keyword-identifier',
        'InvalidKeywordAsVariable.cls',
      );
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(content, 'test.cls', listener, {
        collectReferences: true,
        resolveReferences: true,
      });

      // "if" is not in grammar id rule - parser may fail with syntax error,
      // or if it reaches semantic validation we get invalid.keyword.identifier
      const hasError = (result.errors || []).some(
        (e) =>
          e.message?.includes('Identifier cannot be a keyword') ||
          e.message?.toLowerCase().includes('if'),
      );

      expect(result.errors?.length).toBeGreaterThan(0);
      expect(hasError).toBe(true);
    });
  });
});
