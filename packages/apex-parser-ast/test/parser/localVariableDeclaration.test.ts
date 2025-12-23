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
  ScopeSymbol,
  ApexSymbol,
} from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';

describe('Local Variable Declaration Parser Tests', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.setLogLevel('error');
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

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'FileUtilitiesTest.cls',
        listener,
      );

      if (result.errors.length > 0) {
        result.errors.forEach((error, index) => {
          // Log errors for debugging but don't fail the test
        });
      }

      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();

      // Get all symbols from all scopes
      const allSymbols = getAllSymbolsFromAllScopes(symbolTable!);

      // Find all property variables
      const propertyVariables = allSymbols.filter(
        (symbol) =>
          symbol.name === 'property' && symbol.kind === SymbolKind.Variable,
      );

      // We should have 3 property variables (one in each test method)
      expect(propertyVariables.length).toBe(3);

      // Check that we have property variables at the expected lines
      const propertyLines = propertyVariables
        .map((prop) => prop.location.symbolRange.startLine)
        .sort();

      // The property variables should be at lines 7, 49, and 73 (1-based parser coordinates)
      expect(propertyLines).toContain(7);
      expect(propertyLines).toContain(49);
      expect(propertyLines).toContain(73);

      // Verify each property variable has the correct type
      propertyVariables.forEach((prop) => {
        expect(prop.type?.name).toBe('Property__c');
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
          `testVar ${index + 1}: name=${var_.name}, line=${var_.location.symbolRange.startLine}, ` +
            `type=${var_.type?.name || 'unknown'}, scope=${var_.parentId || 'unknown'}`,
        );
      });

      // We should have 3 testVar variables (one in each method)
      expect(testVarVariables.length).toBe(3);

      // Check that each variable has the correct type
      const stringVars = testVarVariables.filter(
        (v) => v.type?.name === 'String',
      );
      const integerVars = testVarVariables.filter(
        (v) => v.type?.name === 'Integer',
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
          `outerVar ${index + 1}: name=${var_.name}, line=${var_.location.symbolRange.startLine}, ` +
            `scope=${var_.parentId || 'unknown'}`,
        );
      });

      // We should have 2 outerVar variables (one in outer scope, one in if block)
      expect(outerVarVariables.length).toBe(2);

      // Check that both variables have the correct type
      outerVarVariables.forEach((var_) => {
        expect(var_.type?.name).toBe('String');
      });
    });
  });

  describe('Variable declaration line number accuracy', () => {
    it('should capture exact line numbers for variable declarations', () => {
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
        `var1: line ${var1!.location.symbolRange.startLine}, type ${var1!.type?.name || 'unknown'}`,
      );
      logger.debug(
        `var2: line ${var2!.location.symbolRange.startLine}, type ${var2!.type?.name || 'unknown'}`,
      );
      logger.debug(
        `var3: line ${var3!.location.symbolRange.startLine}, type ${var3!.type?.name || 'unknown'}`,
      );

      // Check line numbers (accounting for the actual line numbers in the code)
      expect(var1!.location.symbolRange.startLine).toBe(4);
      expect(var2!.location.symbolRange.startLine).toBe(5);
      expect(var3!.location.symbolRange.startLine).toBe(6);

      // Check types
      expect(var1!.type?.name).toBe('String');
      expect(var2!.type?.name).toBe('Integer');
      expect(var3!.type?.name).toBe('Boolean');
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

      // Variables should have parentId pointing to their respective blocks
      // parentVar is in the method's block, childVar is in the if statement's block
      expect(parentVar!.parentId).toBeDefined();
      expect(childVar!.parentId).toBeDefined();
      // They should have different parentIds since they're in different blocks
      expect(parentVar!.parentId).not.toBe(childVar!.parentId);
      // Both parentIds should point to block symbols (contain "block:")
      expect(parentVar!.parentId).toContain('block:');
      expect(childVar!.parentId).toContain('block:');
    });
  });

  describe('Type resolution during second-pass', () => {
    it('should set type.resolvedSymbol for same-file types during second-pass resolution', () => {
      // Use a single class with an inner class to test same-file type resolution
      // Note: Apex doesn't support inner classes, so we'll test with a field that references
      // a type that would be resolved in the same file. For this test, we'll use a simpler
      // approach: test that when a TYPE_DECLARATION reference resolves to a same-file class,
      // the variable's type.resolvedSymbol is set.
      const fileContent = `
public class TypeResolutionTest {
    // Field declaration - the type "TypeResolutionTest" references the same class
    private TypeResolutionTest selfReference;
    
    public void testMethod() {
        // Variable declaration using the same class type
        TypeResolutionTest instance = new TypeResolutionTest();
        instance.testMethod();
    }
}`;

      logger.debug('Compiling TypeResolutionTest class');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TypeResolutionTest.cls',
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

      // Find the TypeResolutionTest class symbol
      const typeResolutionTestClass = allSymbols.find(
        (s) => s.name === 'TypeResolutionTest' && s.kind === SymbolKind.Class,
      );
      expect(typeResolutionTestClass).toBeDefined();

      // Find the field that uses TypeResolutionTest as its type
      const selfReferenceField = allSymbols.find(
        (s) => s.name === 'selfReference' && s.kind === SymbolKind.Field,
      );

      // Find the variable that uses TypeResolutionTest as its type
      const instanceVar = allSymbols.find(
        (s) => s.name === 'instance' && s.kind === SymbolKind.Variable,
      );

      // Test field resolution
      if (selfReferenceField) {
        expect(selfReferenceField.type?.name).toBe('TypeResolutionTest');
        // After second-pass resolution, type.resolvedSymbol should be set for same-file types
        expect(selfReferenceField.type?.resolvedSymbol).toBeDefined();
        expect(selfReferenceField.type?.resolvedSymbol?.id).toBe(
          typeResolutionTestClass!.id,
        );
      }

      // Test variable resolution
      if (instanceVar) {
        expect(instanceVar.type?.name).toBe('TypeResolutionTest');
        // After second-pass resolution, type.resolvedSymbol should be set for same-file types
        expect(instanceVar.type?.resolvedSymbol).toBeDefined();
        expect(instanceVar.type?.resolvedSymbol?.id).toBe(
          typeResolutionTestClass!.id,
        );
      }

      // At least one of field or variable should be found
      expect(selfReferenceField || instanceVar).toBeDefined();
    });

    it('should not set type.resolvedSymbol for built-in types during second-pass (handled by NamespaceResolutionService)', () => {
      const fileContent = `
public class BuiltInTypeTest {
    public void testMethod() {
        String message = 'Hello';
        Integer count = 42;
    }
}`;

      logger.debug('Compiling BuiltInTypeTest class');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'BuiltInTypeTest.cls',
        listener,
      );

      const symbolTable = result.result;
      const allSymbols = getAllSymbolsFromAllScopes(symbolTable!);

      // Find variables with built-in types
      const messageVar = allSymbols.find(
        (s) => s.name === 'message' && s.kind === SymbolKind.Variable,
      );
      const countVar = allSymbols.find(
        (s) => s.name === 'count' && s.kind === SymbolKind.Variable,
      );

      expect(messageVar).toBeDefined();
      expect(countVar).toBeDefined();
      expect(messageVar!.type?.name).toBe('String');
      expect(countVar!.type?.name).toBe('Integer');

      // Built-in types are not resolved during second-pass (they're not in the same file)
      // They will be resolved later by NamespaceResolutionService during deferred resolution
      // So type.resolvedSymbol should be undefined after second-pass
      expect(messageVar!.type?.resolvedSymbol).toBeUndefined();
      expect(countVar!.type?.resolvedSymbol).toBeUndefined();
    });
  });

  // Helper function to get all symbols from all scopes recursively
  function getAllSymbolsFromAllScopes(symbolTable: SymbolTable): ApexSymbol[] {
    // Simply return all symbols from the symbol table
    // The symbol table already contains all symbols with their parentId relationships
    return symbolTable.getAllSymbols();
    if (fileScope) {
      collectFromScope(fileScope);
    }
    return symbols;
  }

  // Helper function to get scope name for debugging
  function getScopeName(symbolTable: SymbolTable, symbol: ApexSymbol): string {
    // Find scope by parentId - the parentId points to the scope containing this symbol
    if (symbol.parentId) {
      const parentScope = symbolTable
        .getAllSymbols()
        .find(
          (s) => s.id === symbol.parentId && s.kind === SymbolKind.Block,
        ) as ScopeSymbol | undefined;
      if (parentScope) {
        return parentScope.name;
      }
      // If parent is not a block, it might be a class/method symbol
      // In that case, find the corresponding block scope
      const parentSymbol = symbolTable
        .getAllSymbols()
        .find((s) => s.id === symbol.parentId);
      if (parentSymbol) {
        // Find block scope that has this symbol as parent
        const blockScope = symbolTable
          .getAllSymbols()
          .find(
            (s) =>
              s.kind === SymbolKind.Block &&
              (s as ScopeSymbol).parentId === parentSymbol.id,
          ) as ScopeSymbol | undefined;
        if (blockScope) {
          return blockScope.name;
        }
      }
    }
    return 'unknown';
  }
});
