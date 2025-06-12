/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogLevel } from '@salesforce/apex-lsp-logging';

import {
  CompilerService,
  CompilationOptions,
  CompilationResultWithComments,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  ApexFoldingRangeListener,
  FoldingRange,
} from '../../src/parser/listeners/ApexFoldingRangeListener';
import { SymbolTable } from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';

describe('CompilerService Multiple Files Compilation', () => {
  // Set up debug logging for all tests in this suite
  const logger = TestLogger.getInstance();
  logger.setLogLevel(LogLevel.Debug);

  describe('compileMultiple method', () => {
    it('should process multiple files with the same listener type', async () => {
      const service = new CompilerService();
      const listener = new ApexSymbolCollectorListener();

      const files = [
        {
          fileName: 'FirstClass.cls',
          content: `
          public class FirstClass {
            public void firstMethod() { }
          }
          `,
        },
        {
          fileName: 'SecondClass.cls',
          content: `
          public class SecondClass {
            public void secondMethod() { }
          }
          `,
        },
      ];

      const results = await service.compileMultiple(files, listener);

      // Both compilations should succeed
      expect(results.length).toBe(2);
      expect(results[0].errors.length).toBe(0);
      expect(results[1].errors.length).toBe(0);

      // Check symbols from first file
      const firstResult = results[0];
      const firstSymbolTable = firstResult.result as SymbolTable;
      const firstGlobalScope = firstSymbolTable.getCurrentScope();
      const firstClass = firstGlobalScope
        .getAllSymbols()
        .find((s) => s.name === 'FirstClass');

      expect(firstClass).toBeDefined();

      // Check symbols from second file
      const secondResult = results[1];
      const secondSymbolTable = secondResult.result as SymbolTable;
      const secondGlobalScope = secondSymbolTable.getCurrentScope();
      const secondClass = secondGlobalScope
        .getAllSymbols()
        .find((s) => s.name === 'SecondClass');

      expect(secondClass).toBeDefined();
    });
  });

  describe('compileMultipleWithConfigs method', () => {
    it('should process multiple files with different listener types', async () => {
      const service = new CompilerService();
      const symbolListener = new ApexSymbolCollectorListener();
      const foldingListener = new ApexFoldingRangeListener();

      // Test with symbol table listener
      const symbolConfig = {
        fileName: 'SymbolClass.cls',
        content: `
        public class SymbolClass {
          public void symbolMethod() { }
        }
        `,
        listener: symbolListener,
        options: { includeComments: true } as CompilationOptions,
      };

      const symbolResults = await service.compileMultipleWithConfigs([
        symbolConfig,
      ]);
      expect(symbolResults.length).toBe(1);
      expect(symbolResults[0].errors.length).toBe(0);
      expect(symbolResults[0].result).toBeInstanceOf(SymbolTable);

      const symbolTable = symbolResults[0].result as SymbolTable;
      const symbolClass = symbolTable
        .getCurrentScope()
        .getAllSymbols()
        .find((s) => s.name === 'SymbolClass');

      expect(symbolClass).toBeDefined();
      expect('comments' in symbolResults[0]).toBe(true);

      // Test with folding range listener
      const foldingConfig = {
        fileName: 'FoldingClass.cls',
        content: `
        public class FoldingClass {
          public void foldingMethod() {
            if (true) {
              System.debug('test');
            }
          }
        }
        `,
        listener: foldingListener,
        options: { includeComments: false } as CompilationOptions,
      };

      const foldingResults = await service.compileMultipleWithConfigs([
        foldingConfig,
      ]);
      expect(foldingResults.length).toBe(1);
      expect(foldingResults[0].errors.length).toBe(0);
      expect(Array.isArray(foldingResults[0].result)).toBe(true);

      const foldingRanges = foldingResults[0].result as FoldingRange[];
      expect(foldingRanges.length).toBeGreaterThan(0);

      // Find class and method ranges
      const classRange = foldingRanges.find((r) => r.startLine === 2);
      const methodRange = foldingRanges.find((r) => r.startLine === 3);

      expect(classRange).toBeDefined();
      expect(methodRange).toBeDefined();
      expect('comments' in foldingResults[0]).toBe(false);
    });

    it('should process multiple files with different compilation options', async () => {
      const service = new CompilerService();

      // Create two listeners with the same type but different configurations
      const listenerWithComments = new ApexSymbolCollectorListener();
      const listenerNoComments = new ApexSymbolCollectorListener();

      const fileCompilationConfigs = [
        {
          fileName: 'WithComments.cls',
          content: `
          /**
           * Class with comments
           */
          public class WithComments {
            // Method comment
            public void method() { }
          }
          `,
          listener: listenerWithComments,
          options: {
            includeComments: true,
            includeSingleLineComments: true,
          } as CompilationOptions,
        },
        {
          fileName: 'NoComments.cls',
          content: `
          /**
           * Class without comments in result
           */
          public class NoComments {
            // Method comment
            public void method() { }
          }
          `,
          listener: listenerNoComments,
          options: { includeComments: false } as CompilationOptions,
        },
      ];

      const results = await service.compileMultipleWithConfigs(
        fileCompilationConfigs,
      );

      // Both compilations should succeed
      expect(results.length).toBe(2);
      expect(results[0].errors.length).toBe(0);
      expect(results[1].errors.length).toBe(0);

      // Check first result has comments
      const firstResult = results[0];
      expect('comments' in firstResult).toBe(true);
      if ('comments' in firstResult) {
        const resultWithComments =
          firstResult as CompilationResultWithComments<SymbolTable>;
        expect(resultWithComments.comments.length).toBeGreaterThan(0);
        // Should include both multi-line and single-line comments
        expect(
          resultWithComments.comments.some((c) =>
            c.text.includes('Class with comments'),
          ),
        ).toBe(true);
        expect(
          resultWithComments.comments.some((c) =>
            c.text.includes('Method comment'),
          ),
        ).toBe(true);
      }

      // Check second result has no comments
      const secondResult = results[1];
      expect('comments' in secondResult).toBe(false);
    });

    it('should handle errors in individual file compilations', async () => {
      const service = new CompilerService();
      const listener1 = new ApexSymbolCollectorListener();
      const listener2 = new ApexSymbolCollectorListener();

      const fileCompilationConfigs = [
        {
          fileName: 'ValidClass.cls',
          content: `
          public class ValidClass {
            public void validMethod() { }
          }
          `,
          listener: listener1,
          options: {} as CompilationOptions,
        },
        {
          fileName: 'InvalidClass.cls',
          content: `
          public class InvalidClass {
            public void invalidMethod() {
              // Missing closing brace
              if (true) {
                System.debug('error');
              // Missing closing brace here
            }
          }
          `,
          listener: listener2,
          options: {} as CompilationOptions,
        },
      ];

      const results = await service.compileMultipleWithConfigs(
        fileCompilationConfigs,
      );

      // Both compilations should complete
      expect(results.length).toBe(2);

      // First file should have no errors
      expect(results[0].errors.length).toBe(0);
      expect(results[0].result).toBeDefined();

      // Second file should have errors
      expect(results[1].errors.length).toBeGreaterThan(0);
    });
  });
});
