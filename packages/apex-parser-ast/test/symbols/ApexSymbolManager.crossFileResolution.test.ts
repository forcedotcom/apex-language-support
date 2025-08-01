/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';
import {
  TypeReferenceFactory,
  ReferenceContext,
} from '../../src/types/typeReference';
import { SymbolTable } from '../../src/types/symbol';

describe('ApexSymbolManager Cross-File Resolution (Phase 2)', () => {
  let symbolManager: ApexSymbolManager;
  let symbolTable1: SymbolTable;
  let symbolTable2: SymbolTable;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    symbolTable1 = new SymbolTable();
    symbolTable2 = new SymbolTable();
  });

  describe('Built-in Type Resolution', () => {
    it('should resolve System.debug() reference', () => {
      // Create a test class that references System.debug
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the class to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for System.debug
      const systemDebugReference =
        TypeReferenceFactory.createMethodCallReference(
          'debug',
          { startLine: 5, startColumn: 5, endLine: 5, endColumn: 15 },
          'System',
        );

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(systemDebugReference);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );

      // Test finding the System symbol at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 5, character: 7 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('System');
      expect(foundSymbol?.modifiers.isBuiltIn).toBe(true);
    });

    it('should resolve String type reference', () => {
      // Create a test class that declares a String variable
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the class to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for String
      const stringReference =
        TypeReferenceFactory.createTypeDeclarationReference('String', {
          startLine: 3,
          startColumn: 10,
          endLine: 3,
          endColumn: 16,
        });

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(stringReference);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );

      // Test finding the String symbol at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 3, character: 12 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('String');
      expect(foundSymbol?.modifiers.isBuiltIn).toBe(true);
    });

    it('should resolve Integer type reference', () => {
      // Create a test class that declares an Integer variable
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the class to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for Integer
      const integerReference =
        TypeReferenceFactory.createTypeDeclarationReference('Integer', {
          startLine: 4,
          startColumn: 10,
          endLine: 4,
          endColumn: 17,
        });

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(integerReference);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );

      // Test finding the Integer symbol at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 4, character: 12 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('Integer');
      expect(foundSymbol?.modifiers.isBuiltIn).toBe(true);
    });
  });

  describe('Qualified Reference Resolution', () => {
    it('should resolve FileUtilities.createFile() reference', () => {
      // Create FileUtilities class in a separate file
      const fileUtilitiesClass = SymbolFactory.createFullSymbol(
        'FileUtilities',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 20, endColumn: 1 },
        '/utils/FileUtilities.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      const createFileMethod = SymbolFactory.createFullSymbol(
        'createFile',
        SymbolKind.Method,
        { startLine: 5, startColumn: 5, endLine: 10, endColumn: 5 },
        '/utils/FileUtilities.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: true,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        fileUtilitiesClass.id,
      );

      // Add FileUtilities symbols to the manager
      symbolManager.addSymbol(
        fileUtilitiesClass,
        '/utils/FileUtilities.cls',
        symbolTable2,
      );
      symbolManager.addSymbol(
        createFileMethod,
        '/utils/FileUtilities.cls',
        symbolTable2,
      );

      // Create a test class that calls FileUtilities.createFile
      const testClass = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 15, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the test class to the manager
      symbolManager.addSymbol(testClass, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for FileUtilities.createFile
      const createFileReference =
        TypeReferenceFactory.createMethodCallReference(
          'createFile',
          { startLine: 8, startColumn: 15, endLine: 8, endColumn: 25 },
          'FileUtilities',
        );

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(createFileReference);

      // Register both symbol tables with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable2,
        '/utils/FileUtilities.cls',
      );

      // Test finding the createFile method at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 8, character: 18 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('createFile');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
      expect(foundSymbol?.parentId).toBe(fileUtilitiesClass.id);
    });

    it('should resolve Account.Name field reference', () => {
      // Create Account SObject type
      const accountClass = SymbolFactory.createFullSymbol(
        'Account',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 20, endColumn: 1 },
        '/sobjects/Account.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      const nameField = SymbolFactory.createFullSymbol(
        'Name',
        SymbolKind.Field,
        { startLine: 5, startColumn: 5, endLine: 5, endColumn: 15 },
        '/sobjects/Account.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        accountClass.id,
      );

      // Add Account symbols to the manager
      symbolManager.addSymbol(
        accountClass,
        '/sobjects/Account.cls',
        symbolTable2,
      );
      symbolManager.addSymbol(nameField, '/sobjects/Account.cls', symbolTable2);

      // Create a test class that accesses Account.Name
      const testClass = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 15, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the test class to the manager
      symbolManager.addSymbol(testClass, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for Account.Name
      const nameFieldReference =
        TypeReferenceFactory.createFieldAccessReference(
          'Name',
          { startLine: 8, startColumn: 10, endLine: 8, endColumn: 14 },
          'Account',
        );

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(nameFieldReference);

      // Register both symbol tables with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable2,
        '/sobjects/Account.cls',
      );

      // Test finding the Name field at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 8, character: 12 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('Name');
      expect(foundSymbol?.kind).toBe(SymbolKind.Field);
      expect(foundSymbol?.parentId).toBe(accountClass.id);
    });
  });

  describe('Cross-File Symbol Resolution', () => {
    it('should resolve cross-file class reference', () => {
      // Create a utility class in a separate file
      const utilityClass = SymbolFactory.createFullSymbol(
        'UtilityClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 20, endColumn: 1 },
        '/utils/UtilityClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add utility class to the manager
      symbolManager.addSymbol(
        utilityClass,
        '/utils/UtilityClass.cls',
        symbolTable2,
      );

      // Create a test class that references UtilityClass
      const testClass = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 15, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the test class to the manager
      symbolManager.addSymbol(testClass, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for UtilityClass
      const utilityClassReference =
        TypeReferenceFactory.createTypeDeclarationReference('UtilityClass', {
          startLine: 5,
          startColumn: 15,
          endLine: 5,
          endColumn: 27,
        });

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(utilityClassReference);

      // Register both symbol tables with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable2,
        '/utils/UtilityClass.cls',
      );

      // Test finding the UtilityClass at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 5, character: 18 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('UtilityClass');
      expect(foundSymbol?.kind).toBe(SymbolKind.Class);
      expect(foundSymbol?.filePath).toBe('/utils/UtilityClass.cls');
    });

    it('should resolve cross-file method reference', () => {
      // Create a service class with a method
      const serviceClass = SymbolFactory.createFullSymbol(
        'ServiceClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 20, endColumn: 1 },
        '/services/ServiceClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      const serviceMethod = SymbolFactory.createFullSymbol(
        'processData',
        SymbolKind.Method,
        { startLine: 5, startColumn: 5, endLine: 10, endColumn: 5 },
        '/services/ServiceClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: true,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        serviceClass.id,
      );

      // Add service symbols to the manager
      symbolManager.addSymbol(
        serviceClass,
        '/services/ServiceClass.cls',
        symbolTable2,
      );
      symbolManager.addSymbol(
        serviceMethod,
        '/services/ServiceClass.cls',
        symbolTable2,
      );

      // Create a test class that calls the service method
      const testClass = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 15, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the test class to the manager
      symbolManager.addSymbol(testClass, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for ServiceClass.processData
      const processDataReference =
        TypeReferenceFactory.createMethodCallReference(
          'processData',
          { startLine: 8, startColumn: 15, endLine: 8, endColumn: 25 },
          'ServiceClass',
        );

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(processDataReference);

      // Register both symbol tables with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable2,
        '/services/ServiceClass.cls',
      );

      // Test finding the processData method at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 8, character: 18 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('processData');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
      expect(foundSymbol?.parentId).toBe(serviceClass.id);
    });
  });

  describe('Resolution Priority and Specificity', () => {
    it('should prioritize method over class when cursor is on method name', () => {
      // Create a class with a method
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      const methodSymbol = SymbolFactory.createFullSymbol(
        'testMethod',
        SymbolKind.Method,
        { startLine: 3, startColumn: 5, endLine: 5, endColumn: 5 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        classSymbol.id,
      );

      // Add symbols to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable1);
      symbolManager.addSymbol(
        methodSymbol,
        '/test/TestClass.cls',
        symbolTable1,
      );

      // Test finding the method when cursor is on method name
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 3, character: 8 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('testMethod');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
    });

    it('should prioritize field over class when cursor is on field name', () => {
      // Create a class with a field
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      const fieldSymbol = SymbolFactory.createFullSymbol(
        'testField',
        SymbolKind.Field,
        { startLine: 3, startColumn: 5, endLine: 3, endColumn: 15 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        classSymbol.id,
      );

      // Add symbols to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable1);
      symbolManager.addSymbol(fieldSymbol, '/test/TestClass.cls', symbolTable1);

      // Test finding the field when cursor is on field name
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 3, character: 8 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('testField');
      expect(foundSymbol?.kind).toBe(SymbolKind.Field);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent built-in type gracefully', () => {
      // Create a test class
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the class to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for a non-existent built-in type
      const nonExistentReference =
        TypeReferenceFactory.createTypeDeclarationReference('NonExistentType', {
          startLine: 3,
          startColumn: 10,
          endLine: 3,
          endColumn: 25,
        });

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(nonExistentReference);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );

      // Test finding the symbol at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 3, character: 15 },
      );

      // Should return null for non-existent type
      expect(foundSymbol).toBeNull();
    });

    it('should handle qualified reference with non-existent qualifier', () => {
      // Create a test class
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      // Add the class to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable1);

      // Create a TypeReference for NonExistentClass.method
      const nonExistentQualifierReference =
        TypeReferenceFactory.createMethodCallReference(
          'method',
          { startLine: 5, startColumn: 15, endLine: 5, endColumn: 21 },
          'NonExistentClass',
        );

      // Add the TypeReference to the symbol table
      symbolTable1.addTypeReference(nonExistentQualifierReference);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );

      // Test finding the symbol at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 5, character: 18 },
      );

      // Should return null for non-existent qualifier
      expect(foundSymbol).toBeNull();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of cross-file references efficiently', () => {
      const startTime = performance.now();

      // Create multiple utility classes
      for (let i = 0; i < 10; i++) {
        const utilityClass = SymbolFactory.createFullSymbol(
          `UtilityClass${i}`,
          SymbolKind.Class,
          { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
          `/utils/UtilityClass${i}.cls`,
          {
            visibility: SymbolVisibility.Public,
            isStatic: false,
            isFinal: false,
            isAbstract: false,
            isVirtual: false,
            isOverride: false,
            isTransient: false,
            isTestMethod: false,
            isWebService: false,
          },
        );

        symbolManager.addSymbol(utilityClass, `/utils/UtilityClass${i}.cls`);
      }

      // Create a test class with multiple cross-file references
      const testClass = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 50, endColumn: 1 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
      );

      symbolManager.addSymbol(testClass, '/test/TestClass.cls', symbolTable1);

      // Add multiple TypeReferences
      for (let i = 0; i < 20; i++) {
        const reference = TypeReferenceFactory.createTypeDeclarationReference(
          `UtilityClass${i % 10}`,
          {
            startLine: i + 2,
            startColumn: 10,
            endLine: i + 2,
            endColumn: 20 + i,
          },
        );
        symbolTable1.addTypeReference(reference);
      }

      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable1,
        '/test/TestClass.cls',
      );

      // Test multiple symbol lookups
      for (let i = 0; i < 20; i++) {
        const foundSymbol = symbolManager.getSymbolAtPosition(
          '/test/TestClass.cls',
          { line: i + 2, character: 15 },
        );
        expect(foundSymbol).toBeDefined();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 20 lookups in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
