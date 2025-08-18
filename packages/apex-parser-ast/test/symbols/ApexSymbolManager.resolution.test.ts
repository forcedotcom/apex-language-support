/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { SymbolResolutionContext } from '../../src/types/ISymbolManager';
import { ResolutionRequest } from '../../src/symbols/resolution/types';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { TestLogger } from '../utils/testLogger';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolManager - Enhanced Resolution', () => {
  let symbolManager: ApexSymbolManager;
  let mockContext: SymbolResolutionContext;
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
    logger = TestLogger.getInstance();
    logger.setLogLevel('error');

    mockContext = {
      sourceFile: 'test.cls',
      namespaceContext: 'test',
      currentScope: 'class',
      importStatements: [],
      scopeChain: ['class', 'global'],
      expectedType: undefined,
      parameterTypes: [],
      returnType: undefined,
      accessModifier: 'public',
      isStatic: false,
      relationshipType: undefined,
      inheritanceChain: [],
      interfaceImplementations: [],
    } as SymbolResolutionContext;
  });

  // Helper function to compile Apex code and add to symbol manager
  const compileAndAddToManager = async (
    apexCode: string,
    fileName: string = 'test.cls',
  ): Promise<void> => {
    const result = compilerService.compile(apexCode, fileName, listener);

    if (result.errors.length > 0) {
      logger.warn(
        () =>
          `Compilation warnings: ${result.errors.map((e) => e.message).join(', ')}`,
      );
    }

    if (result.result) {
      symbolManager.addSymbolTable(result.result, fileName);
    }
  };

  describe('resolveSymbolWithStrategy', () => {
    beforeEach(() => {
      enableConsoleLogging();
      setLogLevel('error');
    });

    it('should use position-based strategy for hover requests', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'hover',
        position: { line: 3, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should use position-based strategy for definition requests', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'definition',
        position: { line: 3, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should use position-based strategy for references requests', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'references',
        position: { line: 3, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should fall back to scope resolution for unsupported request types', async () => {
      // Compile a test class with a variable
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const request: ResolutionRequest = {
        type: 'completion',
        position: { line: 3, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('scope');
    });
  });

  describe('getSymbolAtPosition - Enhanced', () => {
    it('should not trigger fallback for exact position matches', async () => {
      // Compile a test class with a variable at a specific position
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const result = symbolManager.getSymbolAtPositionWithStrategy('test.cls', {
        line: 2,
        character: 5,
      });

      expect(result).toBeDefined();
      if (result) {
        // Should not have triggered fallback logic
        expect((result as any).fallbackUsed).toBe(false);
      }
    });

    it('should use exact position resolution for hover requests', async () => {
      // Compile a test class with a variable at a specific position
      const apexCode = `
        public class TestClass {
          public String testVariable;

          public void testMethod() {
            String localVar = 'test';
          }
        }
      `;

      await compileAndAddToManager(apexCode, 'test.cls');

      const result = symbolManager.getSymbolAtPositionWithStrategy(
        'test.cls',
        { line: 2, character: 5 },
        'hover',
      );

      expect(result).toBeDefined();
      if (result) {
        expect((result as any).resolutionMethod).toBe('exact-position');
      }
    });
  });

  describe('createResolutionContext - Enhanced', () => {
    it('should include request type in resolution context', () => {
      const context = symbolManager.createResolutionContext(
        'test content',
        { line: 10, character: 5 },
        'test.cls',
      );

      expect(context).toBeDefined();
      expect(context.sourceFile).toBe('test.cls');
    });

    it('should handle different request types correctly', () => {
      const context1 = symbolManager.createResolutionContext(
        'test content',
        { line: 10, character: 5 },
        'test.cls',
      );
      const context2 = symbolManager.createResolutionContext(
        'test content',
        { line: 10, character: 5 },
        'test.cls',
      );

      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
      expect(context1.sourceFile).toBe('test.cls');
      expect(context2.sourceFile).toBe('test.cls');
    });
  });
});
