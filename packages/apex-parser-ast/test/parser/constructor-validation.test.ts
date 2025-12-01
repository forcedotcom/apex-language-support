/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  SymbolTable,
  SymbolKind,
  ApexSymbol,
  MethodSymbol,
} from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';
import { isBlockSymbol, isMethodSymbol } from '../../src/utils/symbolNarrowing';

describe('Constructor Validation Tests', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.debug('Setting up test environment');
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('Dotted Constructor Name Validation', () => {
    it('should report semantic error for dotted constructor name', () => {
      logger.debug('Testing dotted constructor name validation');

      const apexCode = `
        public class OuterClass {
          public class InnerClass {
            public InnerClass.InnerClass2() {
              System.debug('Invalid constructor');
            }
          }
        }
      `;

      // Parse the Apex code
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'OuterClass.cls',
        listener,
      );

      // Should have semantic errors
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for the specific error about dotted constructor names
      const dottedConstructorError = result.errors.find((error) =>
        error.message.includes(
          'Invalid constructor declaration: Constructor names cannot use qualified names',
        ),
      );

      expect(dottedConstructorError).toBeDefined();
      expect(dottedConstructorError?.message).toContain(
        'InnerClass.InnerClass2',
      );

      logger.debug(`Found error: ${dottedConstructorError?.message}`);
    });

    it('should allow valid constructor names', () => {
      logger.debug('Testing valid constructor name');

      const apexCode = `
        public class TestClass {
          public TestClass() {
            System.debug('Valid constructor');
          }
        }
      `;

      // Parse the Apex code
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      // Should not have semantic errors for constructor names
      const constructorNameErrors = result.errors.filter((error) =>
        error.message.includes(
          'Invalid constructor declaration: Constructor names cannot use qualified names',
        ),
      );

      expect(constructorNameErrors.length).toBe(0);

      // Verify the constructor symbol was created correctly
      const symbolTable = result.result;
      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allSymbols = symbolTable?.getAllSymbols() || [];
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
      const testClass = semanticSymbols.find((s) => s.name === 'TestClass');
      expect(testClass).toBeDefined();

      const testClassScope = symbolTable
        ?.getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'TestClass');
      const allClassSymbols = testClassScope?.getAllSymbols() || [];
      const classSemanticSymbols = allClassSymbols.filter((s) => !isBlockSymbol(s));
      let constructor = classSemanticSymbols.find(
        (s) => isMethodSymbol(s) && s.isConstructor,
      ) as MethodSymbol;
      
      // If not found in class scope, check all symbols filtered by parent
      if (!constructor && testClass) {
        const allTableSymbols = symbolTable?.getAllSymbols() || [];
        const allSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
        constructor = allSemanticSymbols.find(
          (s) => isMethodSymbol(s) && s.isConstructor && s.parentId === testClass.id,
        ) as MethodSymbol;
      }

      expect(constructor).toBeDefined();
      expect(constructor.name).toBe('TestClass');
      expect(constructor.isConstructor).toBe(true);
    });

    it('should handle inner class constructors correctly', () => {
      logger.debug('Testing inner class constructor');

      const apexCode = `
        public class OuterClass {
          public class InnerClass {
            public InnerClass() {
              System.debug('Valid inner class constructor');
            }
          }
        }
      `;

      // Parse the Apex code
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'OuterClass.cls',
        listener,
      );

      // Should not have semantic errors for constructor names
      const constructorNameErrors = result.errors.filter((error) =>
        error.message.includes(
          'Invalid constructor declaration: Constructor names cannot use qualified names',
        ),
      );

      expect(constructorNameErrors.length).toBe(0);

      // Verify the inner class constructor was created correctly
      const symbolTable = result.result;
      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allTableSymbols = symbolTable?.getAllSymbols() || [];
      const tableSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
      const outerClass = tableSemanticSymbols.find((s) => s.name === 'OuterClass');
      expect(outerClass).toBeDefined();

      const outerClassScope = symbolTable
        ?.getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'OuterClass');
      const allOuterSymbols = outerClassScope?.getAllSymbols() || [];
      const outerSemanticSymbols = allOuterSymbols.filter((s) => !isBlockSymbol(s));
      let innerClass = outerSemanticSymbols.find((s) => s.name === 'InnerClass');
      
      // If not found in outer class scope, check all symbols filtered by parent
      if (!innerClass && outerClass) {
        const allTableSymbols = symbolTable?.getAllSymbols() || [];
        const allSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
        innerClass = allSemanticSymbols.find(
          (s) => s.name === 'InnerClass' && s.parentId === outerClass.id,
        );
      }
      
      expect(innerClass).toBeDefined();

      const innerClassScope = outerClassScope
        ?.getChildren()
        .find((s) => s.name === 'InnerClass');
      const allInnerSymbols = innerClassScope?.getAllSymbols() || [];
      const innerSemanticSymbols = allInnerSymbols.filter((s) => !isBlockSymbol(s));
      let constructor = innerSemanticSymbols.find(
        (s) => isMethodSymbol(s) && s.isConstructor,
      ) as MethodSymbol;
      
      // If not found in inner class scope, check all symbols filtered by parent
      if (!constructor && innerClass) {
        const allTableSymbols = symbolTable?.getAllSymbols() || [];
        const allSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
        constructor = allSemanticSymbols.find(
          (s) => isMethodSymbol(s) && s.isConstructor && s.parentId === innerClass.id,
        ) as MethodSymbol;
      }

      expect(constructor).toBeDefined();
      expect(constructor.name).toBe('InnerClass');
      expect(constructor.isConstructor).toBe(true);
    });

    it('should report semantic error when constructor name does not match class name', () => {
      logger.debug('Testing constructor name mismatch validation');

      const apexCode = `
        public class TestClass {
          public WrongName() {
            System.debug('Wrong constructor name');
          }
        }
      `;

      // Parse the Apex code
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      // Should have semantic errors
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for the specific error about constructor name mismatch
      const nameMismatchError = result.errors.find(
        (error) =>
          error.message.includes(
            'Invalid constructor declaration: Constructor name',
          ) && error.message.includes('must match the enclosing class name'),
      );

      expect(nameMismatchError).toBeDefined();
      expect(nameMismatchError?.message).toContain('WrongName');
      expect(nameMismatchError?.message).toContain('TestClass');

      logger.debug(`Found error: ${nameMismatchError?.message}`);
    });

    it('should allow constructor when name matches class name', () => {
      logger.debug('Testing matching constructor name');

      const apexCode = `
        public class TestClass {
          public TestClass() {
            System.debug('Correct constructor name');
          }
        }
      `;

      // Parse the Apex code
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      // Should not have semantic errors for constructor name mismatch
      const nameMismatchErrors = result.errors.filter(
        (error) =>
          error.message.includes(
            'Invalid constructor declaration: Constructor name',
          ) && error.message.includes('must match the enclosing class name'),
      );

      expect(nameMismatchErrors.length).toBe(0);

      // Verify the constructor symbol was created correctly
      const symbolTable = result.result;
      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allSymbols = symbolTable?.getAllSymbols() || [];
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
      const testClass = semanticSymbols.find((s) => s.name === 'TestClass');
      expect(testClass).toBeDefined();

      const testClassScope = symbolTable
        ?.getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'TestClass');
      const allClassSymbols = testClassScope?.getAllSymbols() || [];
      const classSemanticSymbols = allClassSymbols.filter((s) => !isBlockSymbol(s));
      let constructor = classSemanticSymbols.find(
        (s) => isMethodSymbol(s) && s.isConstructor,
      ) as MethodSymbol;
      
      // If not found in class scope, check all symbols filtered by parent
      if (!constructor && testClass) {
        const allTableSymbols = symbolTable?.getAllSymbols() || [];
        const allSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
        constructor = allSemanticSymbols.find(
          (s) => isMethodSymbol(s) && s.isConstructor && s.parentId === testClass.id,
        ) as MethodSymbol;
      }

      expect(constructor).toBeDefined();
      expect(constructor.name).toBe('TestClass');
      expect(constructor.isConstructor).toBe(true);
    });
  });
});

// Helper function to check if symbol is a method symbol
function isMethodSymbol(symbol: ApexSymbol): symbol is MethodSymbol {
  return (
    symbol.kind === SymbolKind.Method || symbol.kind === SymbolKind.Constructor
  );
}
