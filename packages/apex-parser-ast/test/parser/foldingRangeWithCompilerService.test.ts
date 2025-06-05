/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogLevel } from '@salesforce/apex-lsp-logging';

import { CompilerService } from '../../src/parser/compilerService';
import {
  ApexFoldingRangeListener,
  FoldingRange,
  FoldingRangeKind,
} from '../../src/parser/listeners/ApexFoldingRangeListener';
import { TestLogger } from '../utils/testLogger';

describe('CompilerService Folding Range Integration', () => {
  // Set up debug logging for all tests in this suite
  const logger = TestLogger.getInstance();
  logger.setLogLevel(LogLevel.Debug);

  describe('Basic Folding Ranges', () => {
    it('should collect folding ranges for class and method declarations', () => {
      const service = new CompilerService();
      const listener = new ApexFoldingRangeListener();

      const code = `
      public class FoldingTestClass {
        public void method1() {
          // method body
          System.debug('test');
        }

        public void method2() {
          if (true) {
            System.debug('nested');
          }
        }
      }
      `;

      const result = service.compile(code, 'FoldingTestClass.cls', listener);

      // Verify compilation succeeds
      expect(result.errors.length).toBe(0);

      // Get the folding ranges
      const ranges = result.result as FoldingRange[];

      // Verify we have the expected ranges
      expect(ranges).toBeDefined();
      expect(ranges.length).toBeGreaterThan(0);

      // Find the class range
      const classRange = ranges.find((r) => r.kind === FoldingRangeKind.Class);
      expect(classRange).toBeDefined();
      expect(classRange?.startLine).toBe(2);
      expect(classRange?.endLine).toBe(13);

      // Find method ranges
      const methodRanges = ranges.filter(
        (r) => r.kind === FoldingRangeKind.Method,
      );
      expect(methodRanges.length).toBe(2);

      // Verify first method range
      expect(methodRanges[0].startLine).toBe(3);
      expect(methodRanges[0].endLine).toBe(6);

      // Verify second method range
      expect(methodRanges[1].startLine).toBe(8);
      expect(methodRanges[1].endLine).toBe(12);
    });

    it('should handle nested folding ranges with correct levels', () => {
      const service = new CompilerService();
      const listener = new ApexFoldingRangeListener();

      const code = `
      public class NestedFoldingTest {
        public void complexMethod() {
          if (true) {
            while (false) {
              for (Integer i = 0; i < 10; i++) {
                System.debug('deeply nested');
              }
            }
          }
        }
      }
      `;

      const result = service.compile(code, 'NestedFoldingTest.cls', listener);

      // Verify compilation succeeds
      expect(result.errors.length).toBe(0);

      // Get the folding ranges
      const ranges = result.result as FoldingRange[];

      // Verify we have the expected ranges
      expect(ranges).toBeDefined();
      expect(ranges.length).toBeGreaterThan(0);

      // Find ranges by kind
      const classRange = ranges.find((r) => r.kind === FoldingRangeKind.Class);
      const methodRange = ranges.find(
        (r) => r.kind === FoldingRangeKind.Method,
      );
      const ifRange = ranges.find(
        (r) => r.kind === FoldingRangeKind.IfStatement,
      );
      const whileRange = ranges.find((r) => r.kind === FoldingRangeKind.While);
      const forRange = ranges.find((r) => r.kind === FoldingRangeKind.For);

      // Verify all ranges exist
      expect(classRange).toBeDefined();
      expect(methodRange).toBeDefined();
      expect(ifRange).toBeDefined();
      expect(whileRange).toBeDefined();
      expect(forRange).toBeDefined();

      // Verify nesting levels
      expect(classRange?.level).toBe(0);
      expect(methodRange?.level).toBe(0);
      expect(ifRange?.level).toBe(1);
      expect(whileRange?.level).toBe(2);
      expect(forRange?.level).toBe(3);
    });
  });

  describe('Complex Folding Scenarios', () => {
    it('should handle multiline statements and SOQL queries', () => {
      const service = new CompilerService();
      const listener = new ApexFoldingRangeListener();

      const code = `
      public class SOQLFoldingTest {
        public void queryMethod() {
          List<Account> accounts = [
            SELECT Id, Name, BillingCity
            FROM Account
            WHERE Name LIKE 'Test%'
            ORDER BY Name
            LIMIT 10
          ];

          String longString = 'This is a very ' +
            'long string that ' +
            'spans multiple lines';
        }
      }
      `;

      const result = service.compile(code, 'SOQLFoldingTest.cls', listener);

      // Verify compilation succeeds
      expect(result.errors.length).toBe(0);

      // Get the folding ranges
      const ranges = result.result as FoldingRange[];

      // Find statement ranges (should include both SOQL and string concatenation)
      const statementRanges = ranges.filter(
        (r) => r.kind === FoldingRangeKind.Statement,
      );
      expect(statementRanges.length).toBe(2);

      // Verify SOQL query range
      const soqlRange = statementRanges[0];
      expect(soqlRange.startLine).toBe(4);
      expect(soqlRange.endLine).toBe(10);

      // Verify string concatenation range
      const stringRange = statementRanges[1];
      expect(stringRange.startLine).toBe(12);
      expect(stringRange.endLine).toBe(14);
    });

    it('should handle multiple files with folding ranges', () => {
      const service = new CompilerService();
      const listener = new ApexFoldingRangeListener();

      const files = [
        {
          fileName: 'FirstClass.cls',
          content: `
          public class FirstClass {
            public void firstMethod() {
              if (true) {
                System.debug('test');
              }
            }
          }
          `,
        },
        {
          fileName: 'SecondClass.cls',
          content: `
          public class SecondClass {
            public void secondMethod() {
              for (Integer i = 0; i < 10; i++) {
                System.debug(i);
              }
            }
          }
          `,
        },
      ];

      const results = service.compileMultiple(files, listener);

      // Both compilations should succeed
      expect(results.length).toBe(2);
      expect(results[0].errors.length).toBe(0);
      expect(results[1].errors.length).toBe(0);

      // Check ranges from first file
      const firstRanges = results[0].result as FoldingRange[];
      const firstClassRange = firstRanges.find(
        (r) => r.kind === FoldingRangeKind.Class,
      );
      const firstMethodRange = firstRanges.find(
        (r) => r.kind === FoldingRangeKind.Method,
      );
      const firstIfRange = firstRanges.find(
        (r) => r.kind === FoldingRangeKind.IfStatement,
      );

      expect(firstClassRange).toBeDefined();
      expect(firstMethodRange).toBeDefined();
      expect(firstIfRange).toBeDefined();

      // Check ranges from second file
      const secondRanges = results[1].result as FoldingRange[];
      const secondClassRange = secondRanges.find(
        (r) => r.kind === FoldingRangeKind.Class,
      );
      const secondMethodRange = secondRanges.find(
        (r) => r.kind === FoldingRangeKind.Method,
      );
      const secondForRange = secondRanges.find(
        (r) => r.kind === FoldingRangeKind.For,
      );

      expect(secondClassRange).toBeDefined();
      expect(secondMethodRange).toBeDefined();
      expect(secondForRange).toBeDefined();
    });
  });
});
