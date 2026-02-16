/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ReferenceContext } from '../../src/types/symbolReference';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

/**
 * Tests for BlockContentListener reference fixes.
 * BlockContentListener is applied when using compileLayered with 'full' layer.
 *
 * These tests verify that we do NOT create false VARIABLE_USAGE for:
 * 1. idPrimary in dot expression (e.g., System in System.debug) - enterIdPrimary skip
 * 2. Qualifier in qualified method calls (e.g., System in System.debug) - CLASS_REFERENCE
 * 3. Base of dot expression for field access (e.g., SomeClass in SomeClass.STATIC_FIELD)
 *
 * And that we do NOT create VARIABLE_USAGE for constructor types (anyId in new Foo())
 */
describe('BlockContentListener reference fixes', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  const compileWithBlockContent = (sourceCode: string) =>
    compilerService.compileLayered(
      sourceCode,
      'Test.cls',
      ['full'],
      undefined,
      { collectReferences: true, resolveReferences: true },
    );

  describe('qualified method calls (System.debug)', () => {
    it('should not create VARIABLE_USAGE for System in System.debug()', () => {
      const sourceCode = `
        public class TestClass {
          public void m() {
            System.debug('test');
          }
        }
      `;

      const result = compileWithBlockContent(sourceCode);
      expect(result.result).toBeDefined();

      const refs = (result.result as any).getAllReferences();
      const systemVarUsages = refs.filter(
        (r: any) =>
          r.name === 'System' && r.context === ReferenceContext.VARIABLE_USAGE,
      );

      expect(systemVarUsages).toHaveLength(0);
    });

    it('should create CLASS_REFERENCE for qualifier in System.debug()', () => {
      const sourceCode = `
        public class TestClass {
          public void m() {
            System.debug('test');
          }
        }
      `;

      const result = compileWithBlockContent(sourceCode);
      expect(result.result).toBeDefined();

      const refs = (result.result as any).getAllReferences();
      const systemClassRefs = refs.filter(
        (r: any) =>
          r.name === 'System' && r.context === ReferenceContext.CLASS_REFERENCE,
      );

      expect(systemClassRefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('constructor calls (new Foo())', () => {
    it('should not create VARIABLE_USAGE for Foo in new Foo()', () => {
      const sourceCode = `
        public class Foo {}
        public class Bar {
          public void m() {
            Foo f = new Foo();
          }
        }
      `;

      const result = compileWithBlockContent(sourceCode);
      expect(result.result).toBeDefined();

      const refs = (result.result as any).getAllReferences();
      const fooVarUsages = refs.filter(
        (r: any) =>
          r.name === 'Foo' && r.context === ReferenceContext.VARIABLE_USAGE,
      );

      expect(fooVarUsages).toHaveLength(0);
    });
  });

  describe('static field access (SomeClass.STATIC_FIELD)', () => {
    it('should not create VARIABLE_USAGE for class base in static field access', () => {
      const sourceCode = `
        public class Helper {
          public static final Integer X = 1;
        }
        public class TestClass {
          public void m() {
            Integer i = Helper.X;
          }
        }
      `;

      const result = compileWithBlockContent(sourceCode);
      expect(result.result).toBeDefined();

      const refs = (result.result as any).getAllReferences();
      const helperVarUsages = refs.filter(
        (r: any) =>
          r.name === 'Helper' && r.context === ReferenceContext.VARIABLE_USAGE,
      );

      expect(helperVarUsages).toHaveLength(0);
    });
  });
});
