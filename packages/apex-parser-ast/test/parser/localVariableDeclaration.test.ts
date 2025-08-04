/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable max-len */

import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  SymbolTable,
  SymbolKind,
  SymbolScope,
  ApexSymbol,
} from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';

describe('Local Variable Declaration Parser Tests', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.setLogLevel('debug');
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('Multiple variables with same name in different scopes', () => {
    it('should collect all property variables from FileUtilitiesTest class with correct line numbers', () => {
      // This test reproduces the exact issue from the hover integration test
      const fileContent = `
@isTest
private with sharing class FileUtilitiesTest {
    @isTest
    static void createFileSucceedsWhenCorrectInput() {
        // GIVEN
        Property__c property = new Property__c();
        insert property;

        String base64Data = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb';
        String fileName = 'file.png';
        String recordId = property.Id;

        // WHEN
        String contentDocumentLinkId = FileUtilities.createFile(
            base64Data,
            fileName,
            recordId
        );

        // THEN
        Assert.isNotNull(contentDocumentLinkId);
    }

    @isTest
    static void createFileFailsWhenIncorrectRecordId() {
        // GIVEN
        String base64Data = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb';
        String fileName = 'file.png';
        String recordId = 'INVALID_ID';

        try {
            // WHEN
            String contentDocumentLinkId = FileUtilities.createFile(
                base64Data,
                fileName,
                recordId
            );
            Assert.fail('Expected an AuraHandledException');
        } catch (Exception e) {
            // THEN)
            Assert.isInstanceOfType(e, AuraHandledException.class);
        }
    }

    @isTest
    static void createFileFailsWhenIncorrectBase64Data() {
        // GIVEN
        Property__c property = new Property__c();
        insert property;

        String base64Data = '';
        String fileName = 'file.png';
        String recordId = property.Id;

        try {
            // WHEN
            String contentDocumentLinkId = FileUtilities.createFile(
                base64Data,
                fileName,
                recordId
            );
            Assert.fail('Expected an AuraHandledException');
        } catch (Exception e) {
            // THEN
            Assert.isInstanceOfType(e, AuraHandledException.class);
        }
    }

    @isTest
    static void createFileFailsWhenIncorrectFilename() {
        // GIVEN
        Property__c property = new Property__c();
        insert property;

        String base64Data = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb';
        String fileName = '';
        String recordId = property.Id;

        try {
            // WHEN
            String contentDocumentLinkId = FileUtilities.createFile(
                base64Data,
                fileName,
                recordId
            );
            Assert.fail('Expected an AuraHandledException');
        } catch (Exception e) {
            // THEN
            Assert.isInstanceOfType(e, AuraHandledException.class);
        }
    }
    
    public void foo() {
        // Method implementation
    }
}`;

      console.log('Compiling FileUtilitiesTest class');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'FileUtilitiesTest.cls',
        listener,
      );

      if (result.errors.length > 0) {
        console.log(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          console.log(`Error ${index + 1}: ${error.message}`);
        });
      } else {
        console.log('No compilation errors found');
      }

      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();

      // Get all symbols from all scopes
      const allSymbols = getAllSymbolsFromAllScopes(symbolTable!);

      console.log(`Total symbols found: ${allSymbols.length}`);
      allSymbols.forEach((symbol, index) => {
        console.log(
          `Symbol ${index + 1}: name=${symbol.name}, kind=${symbol.kind}, ` +
            `line=${symbol.location.startLine}, type=${symbol._typeData?.type?.name || 'unknown'}`,
        );
      });

      // Find all property variables
      const propertyVariables = allSymbols.filter(
        (symbol) =>
          symbol.name === 'property' && symbol.kind === SymbolKind.Variable,
      );

      console.log(`Found ${propertyVariables.length} property variables`);
      propertyVariables.forEach((prop, index) => {
        console.log(
          `Property ${index + 1}: name=${prop.name}, line=${prop.location.startLine}, ` +
            `scope=${prop.parentId || 'unknown'}`,
        );
      });

      // We should have 3 property variables (one in each test method)
      expect(propertyVariables.length).toBe(3);

      // Check that we have property variables at the expected lines
      const propertyLines = propertyVariables
        .map((prop) => prop.location.startLine)
        .sort();
      console.log(`Property variable lines: ${propertyLines.join(', ')}`);

      // The property variables should be at lines 6, 48, and 72 (LSP 0-based coordinates)
      expect(propertyLines).toContain(6);
      expect(propertyLines).toContain(48);
      expect(propertyLines).toContain(72);

      // Verify each property variable has the correct type
      propertyVariables.forEach((prop) => {
        expect(prop._typeData?.type?.name).toBe('Property__c');
      });
    });

    it('should collect variables with same name in different method scopes', () => {
      const fileContent = `
public class VariableScopeTest {
    public void method1() {
        String testVar = 'method1';
        System.debug(testVar);
    }

    public void method2() {
        String testVar = 'method2';
        System.debug(testVar);
    }

    public void method3() {
        Integer testVar = 42;
        System.debug(testVar);
    }
}`;

      logger.debug('Compiling VariableScopeTest class');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'VariableScopeTest.cls',
        listener,
      );

      // Don't fail on compilation errors for now, just log them
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${error.message}`);
        });
      }

      const symbolTable = result.result;
      const allSymbols = getAllSymbolsFromAllScopes(symbolTable!);

      // Find all testVar variables
      const testVarVariables = allSymbols.filter(
        (symbol) =>
          symbol.name === 'testVar' && symbol.kind === SymbolKind.Variable,
      );

      logger.debug(`Found ${testVarVariables.length} testVar variables`);
      testVarVariables.forEach((var_, index) => {
        logger.debug(
          `testVar ${index + 1}: name=${var_.name}, line=${var_.location.startLine}, ` +
            `type=${var_._typeData?.type?.name || 'unknown'}, scope=${var_.parentId || 'unknown'}`,
        );
      });

      // We should have 3 testVar variables (one in each method)
      expect(testVarVariables.length).toBe(3);

      // Check that each variable has the correct type
      const stringVars = testVarVariables.filter(
        (v) => v._typeData?.type?.name === 'String',
      );
      const integerVars = testVarVariables.filter(
        (v) => v._typeData?.type?.name === 'Integer',
      );

      expect(stringVars.length).toBe(2);
      expect(integerVars.length).toBe(1);
    });

    it('should collect variables with same name in nested scopes', () => {
      const fileContent = `
public class NestedScopeTest {
    public void outerMethod() {
        String outerVar = 'outer';
        
        if (true) {
            String outerVar = 'inner'; // Same name in nested scope
            System.debug(outerVar);
        }
        
        System.debug(outerVar);
    }
}`;

      logger.debug('Compiling NestedScopeTest class');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'NestedScopeTest.cls',
        listener,
      );

      // Don't fail on compilation errors for now, just log them
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${error.message}`);
        });
      }

      const symbolTable = result.result;
      const allSymbols = getAllSymbolsFromAllScopes(symbolTable!);

      // Find all outerVar variables
      const outerVarVariables = allSymbols.filter(
        (symbol) =>
          symbol.name === 'outerVar' && symbol.kind === SymbolKind.Variable,
      );

      logger.debug(`Found ${outerVarVariables.length} outerVar variables`);
      outerVarVariables.forEach((var_, index) => {
        logger.debug(
          `outerVar ${index + 1}: name=${var_.name}, line=${var_.location.startLine}, ` +
            `scope=${var_.parentId || 'unknown'}`,
        );
      });

      // We should have 2 outerVar variables (one in outer scope, one in if block)
      expect(outerVarVariables.length).toBe(2);

      // Check that both variables have the correct type
      outerVarVariables.forEach((var_) => {
        expect(var_._typeData?.type?.name).toBe('String');
      });
    });
  });

  describe('Variable declaration line number accuracy', () => {
    it.only('should capture exact line numbers for variable declarations', () => {
      const fileContent = `
  public class LineNumberTest {
    public void testMethod() {
        String var1 = 'first';     // Line 4
        Integer var2 = 42;         // Line 5
        Boolean var3 = true;       // Line 6
    }
}`;

      logger.debug('Compiling LineNumberTest class');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'LineNumberTest.cls',
        listener,
      );

      // Don't fail on compilation errors for now, just log them
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${error.message}`);
        });
      }

      const symbolTable = result.result;
      const allSymbols = getAllSymbolsFromAllScopes(symbolTable!);

      // Find variables by name
      const var1 = allSymbols.find(
        (s) => s.name === 'var1' && s.kind === SymbolKind.Variable,
      );
      const var2 = allSymbols.find(
        (s) => s.name === 'var2' && s.kind === SymbolKind.Variable,
      );
      const var3 = allSymbols.find(
        (s) => s.name === 'var3' && s.kind === SymbolKind.Variable,
      );

      expect(var1).toBeDefined();
      expect(var2).toBeDefined();
      expect(var3).toBeDefined();

      logger.debug(
        `var1: line ${var1!.location.startLine}, type ${var1!._typeData?.type?.name || 'unknown'}`,
      );
      logger.debug(
        `var2: line ${var2!.location.startLine}, type ${var2!._typeData?.type?.name || 'unknown'}`,
      );
      logger.debug(
        `var3: line ${var3!.location.startLine}, type ${var3!._typeData?.type?.name || 'unknown'}`,
      );

      // Check line numbers (accounting for the actual line numbers in the code)
      expect(var1!.location.startLine).toBe(4);
      expect(var2!.location.startLine).toBe(5);
      expect(var3!.location.startLine).toBe(6);

      // Check types
      expect(var1!._typeData?.type?.name).toBe('String');
      expect(var2!._typeData?.type?.name).toBe('Integer');
      expect(var3!._typeData?.type?.name).toBe('Boolean');
    });
  });

  describe('Variable scope and parent relationship', () => {
    it('should correctly establish parent-child relationships for variables', () => {
      const fileContent = `
public class ParentChildTest {
    public void parentMethod() {
        String parentVar = 'parent';
        
        if (true) {
            String childVar = 'child';
            System.debug(parentVar + childVar);
        }
    }
}`;

      logger.debug('Compiling ParentChildTest class');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ParentChildTest.cls',
        listener,
      );

      // Don't fail on compilation errors for now, just log them
      if (result.errors.length > 0) {
        logger.debug(`Compilation errors found: ${result.errors.length}`);
        result.errors.forEach((error, index) => {
          logger.debug(`Error ${index + 1}: ${error.message}`);
        });
      }

      const symbolTable = result.result;
      const allSymbols = getAllSymbolsFromAllScopes(symbolTable!);

      // Find variables
      const parentVar = allSymbols.find(
        (s) => s.name === 'parentVar' && s.kind === SymbolKind.Variable,
      );
      const childVar = allSymbols.find(
        (s) => s.name === 'childVar' && s.kind === SymbolKind.Variable,
      );

      expect(parentVar).toBeDefined();
      expect(childVar).toBeDefined();

      logger.debug(
        `parentVar: parentId=${parentVar!.parentId}, scope=${getScopeName(symbolTable!, parentVar!)}`,
      );
      logger.debug(
        `childVar: parentId=${childVar!.parentId}, scope=${getScopeName(symbolTable!, childVar!)}`,
      );

      // Both variables should be in the same method scope
      expect(parentVar!.parentId).toBe(childVar!.parentId);
    });
  });

  // Helper function to get all symbols from all scopes recursively
  function getAllSymbolsFromAllScopes(symbolTable: SymbolTable): ApexSymbol[] {
    const symbols: ApexSymbol[] = [];

    function collectFromScope(scope: SymbolScope) {
      symbols.push(...scope.getAllSymbols());
      scope.getChildren().forEach(collectFromScope);
    }

    collectFromScope(symbolTable.getCurrentScope());
    return symbols;
  }

  // Helper function to get scope name for debugging
  function getScopeName(symbolTable: SymbolTable, symbol: ApexSymbol): string {
    function findScopeName(
      scope: SymbolScope,
      targetId: string,
    ): string | null {
      const scopeKey = scope.getKey();
      const scopeId =
        scopeKey.unifiedId || `${scopeKey.prefix}:${scopeKey.path.join('.')}`;
      if (scopeId === targetId) {
        return scope.name;
      }
      for (const child of scope.getChildren()) {
        const result = findScopeName(child, targetId);
        if (result) return result;
      }
      return null;
    }

    return (
      findScopeName(symbolTable.getCurrentScope(), symbol.parentId || '') ||
      'unknown'
    );
  }
});
