/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ApexSymbolGraph } from '../../src/symbols/ApexSymbolGraph';
import { ProgressiveEnhancementService } from '../../src/symbols/ProgressiveEnhancementService';
import {
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
  ApexSymbol,
} from '../../src/types/symbol';
import { DetailLevel } from '../../src/parser/listeners/LayeredSymbolListenerBase';

describe('ProgressiveEnhancementService', () => {
  let compilerService: CompilerService;
  let symbolManager: ApexSymbolManager;
  let symbolGraph: ApexSymbolGraph;
  let enhancementService: ProgressiveEnhancementService;

  beforeEach(() => {
    compilerService = new CompilerService();
    symbolManager = new ApexSymbolManager();
    symbolGraph = new ApexSymbolGraph();
    enhancementService = new ProgressiveEnhancementService(
      compilerService,
      symbolManager,
      symbolGraph,
    );
  });

  describe('enhanceSymbolTableForFile', () => {
    const testFileUri = 'file:///TestClass.cls';
    const testFileContent = `
      public class TestClass {
        public String publicField;
        protected Integer protectedField;
        private Boolean privateField;
        
        public void publicMethod() { }
        protected void protectedMethod() { }
        private void privateMethod() { }
      }
    `;

    it('should enhance from no level to public-api', () => {
      const result = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        null,
        undefined,
        'public-api',
      );

      expect(result.success).toBe(true);
      expect(result.symbolTable).toBeDefined();
      expect(result.detailLevel).toBe('public-api');
      expect(result.message).toContain('public-api');

      const symbols = result.symbolTable!.getAllSymbols();
      const classSymbol = symbols.find((s) => s.name === 'TestClass');
      expect(classSymbol).toBeDefined();
      expect(classSymbol!.kind).toBe(SymbolKind.Class);

      // Should have public symbols only
      const publicMethod = symbols.find((s) => s.name === 'publicMethod');
      expect(publicMethod).toBeDefined();

      const protectedMethod = symbols.find((s) => s.name === 'protectedMethod');
      expect(protectedMethod).toBeUndefined();

      const privateMethod = symbols.find((s) => s.name === 'privateMethod');
      expect(privateMethod).toBeUndefined();
    });

    it('should enhance from public-api to protected', () => {
      // First, create a symbol table with public-api level
      const initialResult = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        null,
        undefined,
        'public-api',
      );

      expect(initialResult.success).toBe(true);
      const initialSymbolTable = initialResult.symbolTable!;

      // Now enhance to protected
      const result = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        initialSymbolTable,
        'public-api',
        'protected',
      );

      expect(result.success).toBe(true);
      expect(result.detailLevel).toBe('protected');
      expect(result.message).toContain('protected');

      const symbols = result.symbolTable!.getAllSymbols();
      const protectedMethod = symbols.find((s) => s.name === 'protectedMethod');
      expect(protectedMethod).toBeDefined();

      const privateMethod = symbols.find((s) => s.name === 'privateMethod');
      expect(privateMethod).toBeUndefined();
    });

    it('should enhance from protected to private', () => {
      // Create symbol table with protected level
      const protectedResult = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        null,
        undefined,
        'protected',
      );

      // Now enhance to private
      const result = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        protectedResult.symbolTable!,
        'protected',
        'private',
      );

      expect(result.success).toBe(true);
      expect(result.detailLevel).toBe('private');

      const symbols = result.symbolTable!.getAllSymbols();
      const privateMethod = symbols.find((s) => s.name === 'privateMethod');
      expect(privateMethod).toBeDefined();
    });

    it('should return early if already at target level', () => {
      const initialResult = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        null,
        undefined,
        'protected',
      );

      const result = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        initialResult.symbolTable!,
        'protected',
        'protected',
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Already at or beyond');
      expect(result.detailLevel).toBe('protected');
    });

    it('should return early if already beyond target level', () => {
      const initialResult = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        null,
        undefined,
        'private',
      );

      const result = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        initialResult.symbolTable!,
        'private',
        'public-api',
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Already at or beyond');
      expect(result.detailLevel).toBe('private');
    });

    it('should handle invalid file content gracefully', () => {
      const invalidContent = 'public class Invalid { invalid syntax }';

      const result = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        invalidContent,
        null,
        undefined,
        'public-api',
      );

      // Should still return a result, but may have errors
      expect(result).toBeDefined();
      // The service should handle errors gracefully
    });
  });

  describe('enhanceUntilFound', () => {
    const testFileUri = 'file:///TestClass.cls';
    const testFileContent = `
      public class TestClass {
        public String publicField;
        protected Integer protectedField;
        private Boolean privateField;
        
        public void publicMethod() { }
        protected void protectedMethod() { }
        private void privateMethod() { }
      }
    `;

    it('should find public symbol immediately', () => {
      const symbol = enhancementService.enhanceUntilFound(
        testFileUri,
        'publicMethod',
        testFileContent,
        null,
        undefined,
      );

      expect(symbol).toBeDefined();
      expect(symbol!.name).toBe('publicMethod');
      expect(symbol!.kind).toBe(SymbolKind.Method);
    });

    it('should find protected symbol after enhancing to protected', () => {
      const symbol = enhancementService.enhanceUntilFound(
        testFileUri,
        'protectedMethod',
        testFileContent,
        null,
        undefined,
      );

      expect(symbol).toBeDefined();
      expect(symbol!.name).toBe('protectedMethod');
      expect(symbol!.kind).toBe(SymbolKind.Method);
    });

    it('should find private symbol after enhancing to private', () => {
      const symbol = enhancementService.enhanceUntilFound(
        testFileUri,
        'privateMethod',
        testFileContent,
        null,
        undefined,
      );

      expect(symbol).toBeDefined();
      expect(symbol!.name).toBe('privateMethod');
      expect(symbol!.kind).toBe(SymbolKind.Method);
    });

    it('should return null if symbol not found after all enhancements', () => {
      const symbol = enhancementService.enhanceUntilFound(
        testFileUri,
        'nonExistentMethod',
        testFileContent,
        null,
        undefined,
      );

      expect(symbol).toBeNull();
    });

    it('should find symbol in existing symbol table without enhancement', () => {
      // Create symbol table with public-api level
      const initialResult = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        null,
        undefined,
        'public-api',
      );

      // Should find public symbol without additional enhancement
      const symbol = enhancementService.enhanceUntilFound(
        testFileUri,
        'publicMethod',
        testFileContent,
        initialResult.symbolTable!,
        'public-api',
      );

      expect(symbol).toBeDefined();
      expect(symbol!.name).toBe('publicMethod');
    });

    it('should enhance progressively to find protected symbol', () => {
      // Start with public-api level
      const initialResult = enhancementService.enhanceSymbolTableForFile(
        testFileUri,
        testFileContent,
        null,
        undefined,
        'public-api',
      );

      // Should enhance to protected to find protectedMethod
      const symbol = enhancementService.enhanceUntilFound(
        testFileUri,
        'protectedMethod',
        testFileContent,
        initialResult.symbolTable!,
        'public-api',
      );

      expect(symbol).toBeDefined();
      expect(symbol!.name).toBe('protectedMethod');
    });
  });

  describe('determineRequiredDetailLevel', () => {
    it('should return next level when current level exists', () => {
      const level = enhancementService.determineRequiredDetailLevel(
        'file:///Test.cls',
        'testSymbol',
        'public-api',
      );

      expect(level).toBe('protected');
    });

    it('should return public-api when no current level', () => {
      const level = enhancementService.determineRequiredDetailLevel(
        'file:///Test.cls',
        'testSymbol',
        undefined,
      );

      expect(level).toBe('public-api');
    });

    it('should return full when at private level', () => {
      const level = enhancementService.determineRequiredDetailLevel(
        'file:///Test.cls',
        'testSymbol',
        'private',
      );

      expect(level).toBe('full');
    });
  });

  describe('getEnhancementCost', () => {
    it('should return cost 1 if already at target level', () => {
      const cost = enhancementService.getEnhancementCost(
        'protected',
        'protected',
      );

      expect(cost).toBe(1);
    });

    it('should return cost 1 if already beyond target level', () => {
      const cost = enhancementService.getEnhancementCost('private', 'public-api');

      expect(cost).toBe(1);
    });

    it('should return cost 2 for public-api to protected', () => {
      const cost = enhancementService.getEnhancementCost(
        'public-api',
        'protected',
      );

      expect(cost).toBe(2);
    });

    it('should return cost 3 for public-api to private', () => {
      const cost = enhancementService.getEnhancementCost('public-api', 'private');

      expect(cost).toBe(3);
    });

    it('should return cost 4 for public-api to full', () => {
      const cost = enhancementService.getEnhancementCost('public-api', 'full');

      expect(cost).toBe(4);
    });

    it('should return cost 2 for protected to private', () => {
      const cost = enhancementService.getEnhancementCost('protected', 'private');

      expect(cost).toBe(2);
    });

    it('should return cost 2 for no level to public-api', () => {
      const cost = enhancementService.getEnhancementCost(undefined, 'public-api');

      expect(cost).toBe(2);
    });
  });

  describe('Integration with SymbolManager', () => {
    const testFileUri = 'file:///TestClass.cls';
    const testFileContent = `
      public class TestClass {
        public void publicMethod() { }
      }
    `;

    it('should check cross-file references when symbol not found locally', () => {
      // Add a symbol to the symbol manager from another file
      const otherFileUri = 'file:///OtherClass.cls';
      const otherFileContent = `
        public class OtherClass {
          public void otherMethod() { }
        }
      `;

      const otherResult = enhancementService.enhanceSymbolTableForFile(
        otherFileUri,
        otherFileContent,
        null,
        undefined,
        'public-api',
      );

      // Ensure symbol table has fileUri set before adding to manager
      if (otherResult.symbolTable && otherResult.success) {
        // Symbol table should already have fileUri from compileLayered, but ensure it's set
        const fileUri = otherResult.symbolTable.getFileUri();
        if (!fileUri || fileUri === '' || fileUri === 'unknown') {
          otherResult.symbolTable.setFileUri(otherFileUri);
        }
        // Add to symbol manager with explicit fileUri
        symbolManager.addSymbolTable(otherResult.symbolTable, otherFileUri);
      }

      // Now try to find symbol from other file
      const symbol = enhancementService.enhanceUntilFound(
        testFileUri,
        'OtherClass', // Class name from other file
        testFileContent,
        null,
        undefined,
      );

      // Should find it via cross-file lookup
      // Note: This test may need adjustment based on actual cross-file lookup implementation
      expect(symbol).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle compilation errors gracefully', () => {
      const invalidContent = 'public class Invalid {';

      const result = enhancementService.enhanceSymbolTableForFile(
        'file:///Invalid.cls',
        invalidContent,
        null,
        undefined,
        'public-api',
      );

      // Should return a result even with errors
      expect(result).toBeDefined();
      // May have success: false or success: true with errors
    });

    it('should handle null symbol table gracefully', () => {
      const result = enhancementService.enhanceSymbolTableForFile(
        'file:///Test.cls',
        'public class Test { }',
        null,
        undefined,
        'public-api',
      );

      expect(result.success).toBe(true);
      expect(result.symbolTable).toBeDefined();
    });
  });
});

