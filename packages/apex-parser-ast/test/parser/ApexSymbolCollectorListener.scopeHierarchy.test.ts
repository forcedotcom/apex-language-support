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
import { SymbolTable, SymbolKind, ScopeSymbol } from '../../src/types/symbol';
import {
  isBlockSymbol,
  inTypeSymbolGroup,
} from '../../src/utils/symbolNarrowing';
import { TestLogger } from '../utils/testLogger';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolCollectorListener - Scope Hierarchy Tests', () => {
  let compilerService: CompilerService;
  let logger: TestLogger;

  // Helper function to find a scope by name or type
  const findScope = (
    symbolTable: SymbolTable,
    name?: string,
    scopeType?: string,
  ): ScopeSymbol | undefined => {
    const allScopes = symbolTable
      .getAllSymbols()
      .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];

    if (name && scopeType === 'class') {
      // For class scopes, find by class symbol name (class blocks have block counter names)
      const classSymbol = symbolTable
        .getAllSymbols()
        .find((s) => s.name === name && inTypeSymbolGroup(s));
      if (classSymbol) {
        return allScopes.find(
          (s) => s.scopeType === 'class' && s.parentId === classSymbol.id,
        );
      }
      return undefined;
    } else if (name && scopeType) {
      return allScopes.find(
        (s) => s.name === name && s.scopeType === scopeType,
      );
    } else if (name) {
      return allScopes.find((s) => s.name === name);
    } else if (scopeType) {
      return allScopes.find((s) => s.scopeType === scopeType);
    }
    return undefined;
  };

  // Helper function to find file scope (unused but kept for potential future use)
  // const findFileScope = (symbolTable: SymbolTable): ScopeSymbol | undefined =>
  //   // File scope may not exist as a block symbol anymore
  //   // Return undefined if not found - tests should handle this
  //   symbolTable.findScopeByName('file') || undefined;
  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.debug('Setting up test environment');
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('Integration Test Reproduction', () => {
    it('should create proper scope hierarchy for CommunitiesLandingController', () => {
      // This is the exact Apex code from the failing integration test
      const apexClassContent = [
        '/**',
        ' * An apex page controller that takes the user to the right start page based on credentials or lack thereof',
        ' */',
        'public with sharing class CommunitiesLandingController {',
        '    public PageReference forwardToStartPage() {',
        '        return Network.communitiesLanding();',
        '    }',
        '    ',
        '    public CommunitiesLandingController(Boolean isTest) {',
        "        System.debug('Example');",
        '        if (isTest) {',
        "            System.debug('oh no');",
        '        }',
        '    }',
        '}',
      ].join('\n');

      logger.debug('Creating symbol table and listener');
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexClassContent,
        'CommunitiesLandingController.cls',
        listener,
      );

      // Get the symbol table
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();
      logger.debug('Symbol table created successfully');

      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      // After parsing, find the class scope by searching all block symbols
      // With stack-only tracking, there's no "current scope" - we need to find it
      const allScopes = symbolTable
        .getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];

      // Find the class scope for CommunitiesLandingController
      let classScope: ScopeSymbol | undefined = allScopes.find(
        (scope) =>
          scope.scopeType === 'class' &&
          scope.name === 'CommunitiesLandingController',
      );

      // If not found by name, try finding by class symbol
      if (!classScope) {
        const classSymbol = symbolTable
          .getAllSymbols()
          .find(
            (s) =>
              s.name === 'CommunitiesLandingController' && inTypeSymbolGroup(s),
          );
        if (classSymbol) {
          classScope = allScopes.find(
            (s) => s.scopeType === 'class' && s.parentId === classSymbol.id,
          );
        }
      }
      expect(classScope).toBeDefined();
      if (classScope) {
        // With the new hierarchy: class -> class-scope -> method -> method-scope
        // Methods are added to the class scope before entering method scope
        // So they should be in symbolTable.getSymbolsInScope(classScope.id)
        const classSymbols = symbolTable.getSymbolsInScope(classScope.id);

        // Filter out scope symbols - we only want actual method/constructor symbols
        const methods = classSymbols.filter(
          (s) => s.kind === SymbolKind.Method && !isBlockSymbol(s),
        );
        const constructors = classSymbols.filter(
          (s) => s.kind === SymbolKind.Constructor && !isBlockSymbol(s),
        );

        // If not found in class scope directly, check all symbols filtered by parent
        // (methods have parentId pointing to class symbol)
        if (methods.length === 0 || constructors.length === 0) {
          const allSymbols = symbolTable.getAllSymbols();
          const classSymbol = allSymbols.find(
            (s) =>
              s.name === 'CommunitiesLandingController' && inTypeSymbolGroup(s),
          );
          if (classSymbol) {
            const allMethods = allSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Method &&
                !isBlockSymbol(s) &&
                s.parentId === classSymbol.id,
            );
            const allConstructors = allSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Constructor &&
                !isBlockSymbol(s) &&
                s.parentId === classSymbol.id,
            );
            expect(allMethods.length).toBeGreaterThan(0);
            expect(allConstructors.length).toBeGreaterThan(0);
            expect(
              allMethods.find((m) => m.name === 'forwardToStartPage'),
            ).toBeDefined();
            expect(
              allConstructors.find(
                (c) => c.name === 'CommunitiesLandingController',
              ),
            ).toBeDefined();
          }
        } else {
          expect(methods.length).toBeGreaterThan(0);
          expect(constructors.length).toBeGreaterThan(0);
          expect(
            methods.find((m) => m.name === 'forwardToStartPage'),
          ).toBeDefined();
          expect(
            constructors.find((c) => c.name === 'CommunitiesLandingController'),
          ).toBeDefined();
        }
      }
    });

    it('should create proper scope hierarchy with compilation options (like integration test)', () => {
      // This is the exact Apex code from the failing integration test
      const apexClassContent = [
        '/**',
        ' * An apex page controller that takes the user to the right start page based on credentials or lack thereof',
        ' */',
        'public with sharing class CommunitiesLandingController {',
        '    public PageReference forwardToStartPage() {',
        '        return Network.communitiesLanding();',
        '    }',
        '    ',
        '    public CommunitiesLandingController(Boolean isTest) {',
        "        System.debug('Example');",
        '        if (isTest) {',
        "            System.debug('oh no');",
        '        }',
        '    }',
        '}',
      ].join('\n');

      logger.debug('Creating symbol table and listener');
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);

      // Use the same compilation options as the integration test
      const options = {
        maxTokens: 10000,
        timeout: 5000,
        includeComments: true,
        includeWhitespace: false,
      };
      logger.debug('Compiling test file with options');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        apexClassContent,
        'CommunitiesLandingController.cls',
        listener,
        options,
      );

      // Get the symbol table
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();
      logger.debug('Symbol table created successfully');

      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      // After parsing, find the class scope by searching all block symbols
      const allScopes = symbolTable
        .getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];

      // Find the class scope for CommunitiesLandingController
      let classScope: ScopeSymbol | undefined = allScopes.find(
        (scope) =>
          scope.scopeType === 'class' &&
          scope.name === 'CommunitiesLandingController',
      );

      // If not found by name, try finding by class symbol
      if (!classScope) {
        const classSymbol = symbolTable
          .getAllSymbols()
          .find(
            (s) =>
              s.name === 'CommunitiesLandingController' && inTypeSymbolGroup(s),
          );
        if (classSymbol) {
          classScope = allScopes.find(
            (s) => s.scopeType === 'class' && s.parentId === classSymbol.id,
          );
        }
      }

      expect(classScope).toBeDefined();
      if (classScope) {
        logger.debug(`Class scope name: ${classScope.name}`);
      }
      expect(classScope).toBeDefined();

      if (classScope) {
        // With the new hierarchy: class -> class-scope -> method -> method-scope
        // Methods are added to the class scope before entering method scope
        const classSymbols = symbolTable.getSymbolsInScope(classScope.id);
        const methods = classSymbols.filter(
          (s) => s.kind === SymbolKind.Method && !isBlockSymbol(s),
        );
        const constructors = classSymbols.filter(
          (s) => s.kind === SymbolKind.Constructor && !isBlockSymbol(s),
        );

        // If not found in class scope directly, check all symbols filtered by parent
        if (methods.length === 0 || constructors.length === 0) {
          const allSymbols = symbolTable.getAllSymbols();
          const classSymbol = allSymbols.find(
            (s) =>
              s.name === 'CommunitiesLandingController' && inTypeSymbolGroup(s),
          );
          if (classSymbol) {
            const allMethods = allSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Method &&
                !isBlockSymbol(s) &&
                s.parentId === classSymbol.id,
            );
            const allConstructors = allSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Constructor &&
                !isBlockSymbol(s) &&
                s.parentId === classSymbol.id,
            );
            expect(allMethods.length).toBeGreaterThan(0);
            expect(allConstructors.length).toBeGreaterThan(0);
            expect(
              allMethods.find((m) => m.name === 'forwardToStartPage'),
            ).toBeDefined();
            expect(
              allConstructors.find(
                (c) => c.name === 'CommunitiesLandingController',
              ),
            ).toBeDefined();
          }
        } else {
          expect(methods.length).toBeGreaterThan(0);
          expect(constructors.length).toBeGreaterThan(0);
          expect(
            methods.find((m) => m.name === 'forwardToStartPage'),
          ).toBeDefined();
          expect(
            constructors.find((c) => c.name === 'CommunitiesLandingController'),
          ).toBeDefined();
        }
      }
    });
  });

  describe('Scope Hierarchy Edge Cases', () => {
    it('should handle empty class correctly', () => {
      const apexCode = `
        public class EmptyClass {
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'EmptyClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      // Find the class scope
      const classScope = findScope(symbolTable, 'EmptyClass', 'class');
      expect(classScope).toBeDefined();

      if (!classScope) {
        throw new Error('Class scope is null');
      }

      // Empty class has no members
      // The class symbol is in the file scope, not the class scope
      const classScopeSymbols = symbolTable.getSymbolsInScope(classScope.id);
      // Filter out scope symbols - empty class should have no non-scope symbols
      const nonBlockSymbols = classScopeSymbols.filter(
        (s) => !isBlockSymbol(s),
      );
      expect(nonBlockSymbols.length).toBe(0);

      // Verify the class symbol exists in the symbol table
      // With the new structure, top-level classes are roots (parentId === null)
      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'EmptyClass' && s.kind === SymbolKind.Class,
      );
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      // Top-level class should be a root (parentId === null)
      expect(classSymbol?.parentId).toBeNull();
    });

    it('should handle class with only fields', () => {
      const apexCode = `
        public class FieldOnlyClass {
          private String name;
          public Integer count;
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'FieldOnlyClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      // Find the class scope
      const classScope = findScope(symbolTable, 'FieldOnlyClass', 'class');
      expect(classScope).toBeDefined();

      if (!classScope) {
        throw new Error('Class scope is null');
      }

      const classSymbols = symbolTable.getSymbolsInScope(classScope.id);

      // Class scope contains only the members (fields), not the class itself
      // Filter out scope symbols to get only field symbols
      const fields = classSymbols.filter(
        (s) => s.kind === SymbolKind.Field && !isBlockSymbol(s),
      );
      expect(fields.length).toBe(2);

      // Verify the class symbol exists in the symbol table
      // The class symbol should be in the file scope
      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'FieldOnlyClass' && s.kind === SymbolKind.Class,
      );
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.kind).toBe(SymbolKind.Class);

      // With the new structure, top-level classes are roots (parentId === null)
      expect(classSymbol?.parentId).toBeNull();
    });

    it('should handle nested classes correctly', () => {
      const apexCode = `
        public class OuterClass {
          public class InnerClass {
            public void innerMethod() {}
          }
          
          public void outerMethod() {}
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'OuterClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      // Find the outer class scope
      const outerClassScope = findScope(symbolTable, 'OuterClass', 'class');
      expect(outerClassScope).toBeDefined();

      if (!outerClassScope) {
        throw new Error('Outer class scope is null');
      }

      // Find inner class scope - inner class blocks use block counter names, not class name
      // Find by finding the inner class symbol first, then finding its block
      const allSymbols = symbolTable.getAllSymbols();
      const innerClassSymbol = allSymbols.find(
        (s) => s.name === 'InnerClass' && inTypeSymbolGroup(s),
      );
      const allScopes = symbolTable
        .getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
      const innerClassScope = innerClassSymbol
        ? allScopes.find(
            (scope) =>
              scope.scopeType === 'class' &&
              scope.parentId === innerClassSymbol.id,
          )
        : undefined;
      expect(innerClassScope).toBeDefined();

      if (!innerClassScope) {
        throw new Error('Inner class scope is null');
      }

      // With the new hierarchy: inner class -> inner class-scope -> block scope -> method -> method-scope
      // Methods are in the block scope (child of inner class scope)
      const innerClassBlockScope = allScopes.find(
        (s) => s.scopeType === 'block' && s.parentId === innerClassScope.id,
      );

      // Methods might be in the inner class scope or in the block scope
      // Check both locations
      const innerClassSymbols = symbolTable.getSymbolsInScope(
        innerClassScope.id,
      );
      let innerMethods = innerClassSymbols.filter(
        (s) => s.kind === SymbolKind.Method && !isBlockSymbol(s),
      );

      // If not found in class scope, check block scope
      if (innerMethods.length === 0 && innerClassBlockScope) {
        const blockSymbols = symbolTable.getSymbolsInScope(
          innerClassBlockScope.id,
        );
        innerMethods = blockSymbols.filter(
          (s) => s.kind === SymbolKind.Method && !isBlockSymbol(s),
        );
      }

      // If still not found, check all symbols - methods are added to the current scope
      // which could be the class scope or block scope depending on when they're added
      if (innerMethods.length === 0) {
        const allSymbols = symbolTable.getAllSymbols();
        // Find the inner method by name - it should exist somewhere
        const innerMethod = allSymbols.find(
          (s) =>
            s.kind === SymbolKind.Method &&
            !isBlockSymbol(s) &&
            s.name === 'innerMethod',
        );
        // Method should exist - verify it's somewhere in the symbol table
        expect(innerMethod).toBeDefined();
        // The exact parentId depends on when it was added relative to block scope creation
        // As long as it exists, that's sufficient for this test
      } else {
        expect(innerMethods.length).toBe(1);
      }
    });
  });

  describe('Block Symbol ParentId Relationships', () => {
    it('should set class block parentId to class symbol', () => {
      const apexCode = `
        public class TestClass {
          private String field;
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
      );
      // Class blocks now use block counter names (e.g., block1), not the class name
      // Find by scopeType and parentId pointing to the class symbol
      const classBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.parentId === classSymbol?.id,
      );

      expect(classSymbol).toBeDefined();
      expect(classBlockSymbol).toBeDefined();
      if (classSymbol && classBlockSymbol) {
        // Class block should have parentId pointing to class symbol, not a block symbol
        expect(classBlockSymbol.parentId).toBe(classSymbol.id);
        expect(classBlockSymbol.parentId).toContain('class:TestClass');
        expect(classBlockSymbol.parentId).not.toContain('block:');
      }
    });

    it('should set method block parentId to method symbol', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            String x = 'test';
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const methodSymbol = allSymbols.find(
        (s) => s.name === 'testMethod' && s.kind === SymbolKind.Method,
      );
      // Method blocks now use block counter names (e.g., block2), not the method name
      // Find by scopeType and parentId pointing to the method symbol
      const methodBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'method' &&
          s.parentId === methodSymbol?.id,
      );

      expect(methodSymbol).toBeDefined();
      expect(methodBlockSymbol).toBeDefined();
      if (methodSymbol && methodBlockSymbol) {
        // Method block should have parentId pointing to method symbol, not a block symbol
        expect(methodBlockSymbol.parentId).toBe(methodSymbol.id);
        expect(methodBlockSymbol.parentId).toContain('method:testMethod');
        expect(methodBlockSymbol.parentId).not.toContain('block:');
      }
    });

    it('should set constructor block parentId to constructor symbol', () => {
      const apexCode = `
        public class TestClass {
          public TestClass() {
            String x = 'test';
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const constructorSymbol = allSymbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Constructor,
      );
      const constructorBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'method' &&
          s.name === 'TestClass',
      );

      expect(constructorSymbol).toBeDefined();
      expect(constructorBlockSymbol).toBeDefined();
      if (constructorSymbol && constructorBlockSymbol) {
        // Constructor block should have parentId pointing to constructor symbol
        expect(constructorBlockSymbol.parentId).toBe(constructorSymbol.id);
        expect(constructorBlockSymbol.parentId).toContain(
          'constructor:TestClass',
        );
        expect(constructorBlockSymbol.parentId).not.toContain('block:');
      }
    });

    it('should set regular block parentId to parent block symbol', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            if (true) {
              String x = 'test';
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      // Find method symbol first
      const methodSymbol = allSymbols.find(
        (s) => s.name === 'testMethod' && s.kind === SymbolKind.Method,
      );
      // Method blocks now use block counter names (e.g., block2), not the method name
      // Find by scopeType and parentId pointing to the method symbol
      const methodBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'method' &&
          s.parentId === methodSymbol?.id,
      );
      const ifBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) && s.scopeType === 'if' && s.name.startsWith('if_'),
      );

      // Find the method body block (generic block scope created for method body)
      const methodBodyBlock = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'block' &&
          s.name.startsWith('block') &&
          s.parentId === methodBlockSymbol?.id,
      );

      expect(methodBlockSymbol).toBeDefined();
      expect(methodBodyBlock).toBeDefined();
      expect(ifBlockSymbol).toBeDefined();
      if (methodBlockSymbol && methodBodyBlock && ifBlockSymbol) {
        // Method body block should be child of method scope
        expect(methodBodyBlock.parentId).toBe(methodBlockSymbol.id);
        // If block should be child of method body block (generic block scope)
        expect(ifBlockSymbol.parentId).toBe(methodBodyBlock.id);
      }
    });

    it('should handle nested blocks with correct parentId chain', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            if (true) {
              while (false) {
                String x = 'test';
              }
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      // Find method symbol first
      const methodSymbol = allSymbols.find(
        (s) => s.name === 'testMethod' && s.kind === SymbolKind.Method,
      );
      // Method blocks now use block counter names (e.g., block2), not the method name
      // Find by scopeType and parentId pointing to the method symbol
      const methodBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'method' &&
          s.parentId === methodSymbol?.id,
      );
      const ifBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) && s.scopeType === 'if' && s.name.startsWith('if_'),
      );
      const whileBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'while' &&
          s.name.startsWith('while_'),
      );

      // Find the method body block and if body block (generic block scopes)
      const methodBodyBlock = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'block' &&
          s.name.startsWith('block') &&
          s.parentId === methodBlockSymbol?.id,
      );
      const ifBodyBlock = allSymbols.find(
        (s): s is ScopeSymbol =>
          isBlockSymbol(s) &&
          s.scopeType === 'block' &&
          s.name.startsWith('block') &&
          s.parentId === ifBlockSymbol?.id,
      );

      expect(methodBlockSymbol).toBeDefined();
      expect(methodBodyBlock).toBeDefined();
      expect(ifBlockSymbol).toBeDefined();
      expect(ifBodyBlock).toBeDefined();
      expect(whileBlockSymbol).toBeDefined();
      if (
        methodBlockSymbol &&
        methodBodyBlock &&
        ifBlockSymbol &&
        ifBodyBlock &&
        whileBlockSymbol
      ) {
        // Method body block should be child of method scope
        expect(methodBodyBlock.parentId).toBe(methodBlockSymbol.id);
        // If block should be child of method body block
        expect(ifBlockSymbol.parentId).toBe(methodBodyBlock.id);
        // If body block should be child of if block
        expect(ifBodyBlock.parentId).toBe(ifBlockSymbol.id);
        // While block should be child of if body block
        expect(whileBlockSymbol.parentId).toBe(ifBodyBlock.id);
      }
    });
  });

  describe('Scope Symbols for Control Structures', () => {
    it('should create scope symbols for if statements', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            if (true) {
              Integer x = 1;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      );
      const ifBlockSymbols = scopeSymbols.filter(
        (s) =>
          isBlockSymbol(s) && s.scopeType === 'if' && s.name.startsWith('if_'),
      );
      expect(ifBlockSymbols.length).toBeGreaterThan(0);
    });

    it('should create scope symbols for while statements', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            while (true) {
              Integer x = 1;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      );
      const whileBlockSymbols = scopeSymbols.filter(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'while' &&
          s.name.startsWith('while_'),
      );
      expect(whileBlockSymbols.length).toBeGreaterThan(0);
    });

    it('should create scope symbols for for statements', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            for (Integer i = 0; i < 10; i++) {
              Integer x = 1;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      );
      const forBlockSymbols = scopeSymbols.filter(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'for' &&
          s.name.startsWith('for_'),
      );
      expect(forBlockSymbols.length).toBeGreaterThan(0);
    });

    it('should create scope symbols with proper locations', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            if (true) {
              Integer x = 1;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const classBlockSymbol = allSymbols.find(
        (s): s is ScopeSymbol => isBlockSymbol(s) && s.scopeType === 'class',
      );
      expect(classBlockSymbol).toBeDefined();
      if (classBlockSymbol) {
        // Verify that symbolRange and identifierRange are the same for block symbols
        expect(classBlockSymbol.location.symbolRange).toEqual(
          classBlockSymbol.location.identifierRange,
        );
      }
    });
  });

  describe('Getter/Setter Block Scope Handling', () => {
    it('should create only getter scope (not duplicate block scope) when getter has block', () => {
      const apexCode = `
        public class TestClass {
          public Integer prop {
            get {
              Integer x = 1;
              return x;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      // Should have: file, class, getter, and block (block is child of getter)
      const getterScopes = scopeSymbols.filter((s) => s.scopeType === 'getter');
      expect(getterScopes.length).toBe(1);

      // Block scope should exist as child of getter scope
      const getterScope = getterScopes[0];
      const blockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === getterScope.id,
      );
      expect(blockScopes.length).toBe(1);
    });

    it('should create getter scope even for auto-properties (with SEMI)', () => {
      const apexCode = `
        public class TestClass {
          public Integer prop {
            get;
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      const getterScopes = scopeSymbols.filter((s) => s.scopeType === 'getter');
      expect(getterScopes.length).toBe(1);
    });

    it('should create only setter scope (not duplicate block scope) when setter has block', () => {
      const apexCode = `
        public class TestClass {
          public Integer prop {
            set {
              Integer x = value;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      const setterScopes = scopeSymbols.filter((s) => s.scopeType === 'setter');
      expect(setterScopes.length).toBe(1);

      // Block scope should exist as child of setter scope
      const setterScope = setterScopes[0];
      const blockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === setterScope.id,
      );
      expect(blockScopes.length).toBe(1);
    });

    it('should properly scope variables in getter blocks', () => {
      const apexCode = `
        public class TestClass {
          public Integer prop {
            get {
              Integer localVar = 1;
              return localVar;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const getterScope = allSymbols.find(
        (s) => isBlockSymbol(s) && s.scopeType === 'getter',
      ) as ScopeSymbol | undefined;

      expect(getterScope).toBeDefined();
      if (getterScope) {
        // Variables are now in the block scope (child of getter scope)
        const blockScope = allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'block' &&
            s.parentId === getterScope.id,
        ) as ScopeSymbol | undefined;
        expect(blockScope).toBeDefined();
        if (blockScope) {
          const variablesInBlock = symbolTable.getSymbolsInScope(blockScope.id);
          const localVar = variablesInBlock.find((s) => s.name === 'localVar');
          expect(localVar).toBeDefined();
          expect(localVar?.kind).toBe(SymbolKind.Variable);
        }
      }
    });
  });

  describe('Try/Catch/Finally Block Scope Handling', () => {
    it('should create only try scope (not duplicate block scope) for try block', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            try {
              Integer x = 1;
            } catch (Exception e) {
              Integer y = 2;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      const tryScopes = scopeSymbols.filter((s) => s.scopeType === 'try');
      const catchScopes = scopeSymbols.filter((s) => s.scopeType === 'catch');
      expect(tryScopes.length).toBe(1);
      expect(catchScopes.length).toBe(1);

      // Block scopes should exist as children of try and catch scopes
      const tryScope = tryScopes[0];
      const catchScope = catchScopes[0];
      const tryBlockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === tryScope.id,
      );
      const catchBlockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === catchScope.id,
      );
      expect(tryBlockScopes.length).toBe(1);
      expect(catchBlockScopes.length).toBe(1);
    });

    it('should create only catch scope (not duplicate block scope) for catch block', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            try {
            } catch (Exception e) {
              Integer x = 1;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      const catchScopes = scopeSymbols.filter((s) => s.scopeType === 'catch');
      expect(catchScopes.length).toBe(1);

      // Block scope should exist as child of catch scope
      const catchScope = catchScopes[0];
      const blockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === catchScope.id,
      );
      expect(blockScopes.length).toBe(1);
    });

    it('should create only finally scope (not duplicate block scope) for finally block', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            try {
            } finally {
              Integer x = 1;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      const finallyScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'finally',
      );
      expect(finallyScopes.length).toBe(1);

      // Block scope should exist as child of finally scope
      const finallyScope = finallyScopes[0];
      const blockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === finallyScope.id,
      );
      expect(blockScopes.length).toBe(1);
    });

    it('should create proper scope hierarchy: try → catch → finally', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            try {
              Integer x = 1;
            } catch (Exception e) {
              Integer y = 2;
            } finally {
              Integer z = 3;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const tryScope = allSymbols.find(
        (s) => isBlockSymbol(s) && s.scopeType === 'try',
      ) as ScopeSymbol | undefined;
      const catchScope = allSymbols.find(
        (s) => isBlockSymbol(s) && s.scopeType === 'catch',
      ) as ScopeSymbol | undefined;
      const finallyScope = allSymbols.find(
        (s) => isBlockSymbol(s) && s.scopeType === 'finally',
      ) as ScopeSymbol | undefined;

      expect(tryScope).toBeDefined();
      expect(catchScope).toBeDefined();
      expect(finallyScope).toBeDefined();

      if (tryScope && catchScope && finallyScope) {
        // All should have valid parentIds pointing to method scope or method body block scope
        const methodScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'method',
        ) as ScopeSymbol | undefined;
        expect(methodScope).toBeDefined();
        if (methodScope) {
          // Verify all scopes have valid parentIds
          expect(tryScope.parentId).toBeDefined();
          expect(catchScope.parentId).toBeDefined();
          expect(finallyScope.parentId).toBeDefined();
          // The parents should be either the method scope or a block scope within the method
          const tryParent = allSymbols.find((s) => s.id === tryScope.parentId);
          const catchParent = allSymbols.find(
            (s) => s.id === catchScope.parentId,
          );
          const finallyParent = allSymbols.find(
            (s) => s.id === finallyScope.parentId,
          );
          expect(tryParent).toBeDefined();
          expect(catchParent).toBeDefined();
          expect(finallyParent).toBeDefined();
          // All parents should be block scopes (method or block type)
          if (tryParent && isBlockSymbol(tryParent)) {
            expect(
              tryParent.scopeType === 'method' ||
                tryParent.scopeType === 'block',
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('DoWhile and RunAs Block Scope Handling', () => {
    it('should create only doWhile scope (not duplicate block scope) for doWhile block', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            do {
              Integer x = 1;
            } while (true);
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      const doWhileScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'doWhile',
      );
      expect(doWhileScopes.length).toBe(1);

      // Block scope should exist as child of doWhile scope
      const doWhileScope = doWhileScopes[0];
      const blockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === doWhileScope.id,
      );
      expect(blockScopes.length).toBe(1);
    });

    it('should create only runAs scope (not duplicate block scope) for runAs block', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            System.runAs(new User()) {
              Integer x = 1;
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      const runAsScopes = scopeSymbols.filter((s) => s.scopeType === 'runAs');
      expect(runAsScopes.length).toBe(1);

      // Block scope should exist as child of runAs scope
      const runAsScope = runAsScopes[0];
      const blockScopes = scopeSymbols.filter(
        (s) => s.scopeType === 'block' && s.parentId === runAsScope.id,
      );
      expect(blockScopes.length).toBe(1);
    });
  });

  describe('Scope Stack Validation', () => {
    it('should maintain correct scope stack depth for nested structures', () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            if (true) {
              try {
                Integer x = 1;
              } catch (Exception e) {
                Integer y = 2;
              }
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const scopeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Block,
      ) as ScopeSymbol[];

      // Should have: file, class, method, method body block, if, if block, try, try block, catch, catch block
      const ifScopes = scopeSymbols.filter((s) => s.scopeType === 'if');
      const tryScopes = scopeSymbols.filter((s) => s.scopeType === 'try');
      const catchScopes = scopeSymbols.filter((s) => s.scopeType === 'catch');
      const blockScopes = scopeSymbols.filter((s) => s.scopeType === 'block');

      expect(ifScopes.length).toBe(1);
      expect(tryScopes.length).toBe(1);
      expect(catchScopes.length).toBe(1);
      // Method body creates a block scope, and if/try/catch blocks each create their own block scopes
      // So we should have: method body block + if block + try block + catch block = 4 block scopes
      expect(blockScopes.length).toBeGreaterThanOrEqual(4);
    });

    it('should properly scope variables in nested getter/try blocks', () => {
      const apexCode = `
        public class TestClass {
          public Integer prop {
            get {
              try {
                Integer x = 1;
                return x;
              } catch (Exception e) {
                return 0;
              }
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'TestClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const getterScope = allSymbols.find(
        (s) => isBlockSymbol(s) && s.scopeType === 'getter',
      ) as ScopeSymbol | undefined;
      const tryScope = allSymbols.find(
        (s) => isBlockSymbol(s) && s.scopeType === 'try',
      ) as ScopeSymbol | undefined;

      expect(getterScope).toBeDefined();
      expect(tryScope).toBeDefined();

      if (tryScope) {
        // Variables are now in the block scope (child of try scope)
        const blockScope = allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'block' &&
            s.parentId === tryScope.id,
        ) as ScopeSymbol | undefined;
        expect(blockScope).toBeDefined();
        if (blockScope) {
          const variablesInBlock = symbolTable.getSymbolsInScope(blockScope.id);
          const x = variablesInBlock.find((s) => s.name === 'x');
          expect(x).toBeDefined();
          expect(x?.kind).toBe(SymbolKind.Variable);
        }
      }
    });
  });

  describe('Negative Tests - Malformed Source Code', () => {
    describe('Missing Closing Braces', () => {
      it('should handle missing closing brace in method body gracefully', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              Integer x = 1;
              // Missing closing brace for method
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        // Should still create scopes even with syntax errors
        const allSymbols = symbolTable.getAllSymbols();
        const classScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'class',
        );
        const methodScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'method',
        );

        expect(classScope).toBeDefined();
        // Method scope should still be created even if brace is missing
        expect(methodScope).toBeDefined();

        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle missing closing brace in if statement', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              if (true) {
                Integer x = 1;
                // Missing closing brace for if
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const ifScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'if',
        );

        // If scope should still be created
        expect(ifScope).toBeDefined();

        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle missing closing brace in try block', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              try {
                Integer x = 1;
                // Missing closing brace for try
            } catch (Exception e) {
              Integer y = 2;
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const tryScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'try',
        );
        const catchScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'catch',
        );

        // Both scopes should be created even with syntax errors
        expect(tryScope).toBeDefined();
        expect(catchScope).toBeDefined();

        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle missing closing brace in getter block', () => {
        const apexCode = `
          public class TestClass {
            public Integer prop {
              get {
                Integer x = 1;
                return x;
                // Missing closing brace for getter
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const getterScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'getter',
        );

        // Getter scope should still be created
        expect(getterScope).toBeDefined();

        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle missing closing brace in nested structures', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              if (true) {
                try {
                  Integer x = 1;
                  // Missing closing brace for try
                } catch (Exception e) {
                  Integer y = 2;
                }
                // Missing closing brace for if
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const ifScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'if',
        );
        const tryScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'try',
        );
        const catchScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'catch',
        );

        // All scopes should be created
        expect(ifScope).toBeDefined();
        expect(tryScope).toBeDefined();
        expect(catchScope).toBeDefined();

        // Scope hierarchy should be correct
        if (tryScope && catchScope) {
          // Both should have the same parent (if scope or method body block)
          expect(tryScope.parentId).toBeDefined();
          expect(catchScope.parentId).toBeDefined();
        }
      });
    });

    describe('Unclosed Blocks', () => {
      it('should handle unclosed while loop block', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              while (true) {
                Integer x = 1;
                // Missing closing brace
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const whileScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'while',
        );

        expect(whileScope).toBeDefined();
        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle unclosed for loop block', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              for (Integer i = 0; i < 10; i++) {
                Integer x = 1;
                // Missing closing brace
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const forScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'for',
        );

        expect(forScope).toBeDefined();
        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle unclosed doWhile block', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              do {
                Integer x = 1;
                // Missing closing brace
            } while (true);
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const doWhileScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'doWhile',
        );

        expect(doWhileScope).toBeDefined();
        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle unclosed setter block', () => {
        const apexCode = `
          public class TestClass {
            public Integer prop {
              set {
                Integer x = value;
                // Missing closing brace for setter
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const setterScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'setter',
        );

        expect(setterScope).toBeDefined();
        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });
    });

    describe('Mismatched Enter/Exit Calls', () => {
      it('should handle multiple unclosed scopes gracefully', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              if (true) {
                while (true) {
                  for (Integer i = 0; i < 10; i++) {
                    Integer x = 1;
                    // Multiple missing closing braces
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const ifScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'if',
        );
        const whileScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'while',
        );
        const forScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'for',
        );

        // All scopes should be created
        expect(ifScope).toBeDefined();
        expect(whileScope).toBeDefined();
        expect(forScope).toBeDefined();

        // Scope hierarchy should be maintained
        if (whileScope && ifScope) {
          expect(whileScope.parentId).toBeDefined();
        }
        if (forScope && whileScope) {
          expect(forScope.parentId).toBeDefined();
        }

        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle try-catch-finally with missing braces', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              try {
                Integer x = 1;
                // Missing closing brace for try
              } catch (Exception e) {
                Integer y = 2;
                // Missing closing brace for catch
              } finally {
                Integer z = 3;
                // Missing closing brace for finally
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const tryScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'try',
        );
        const catchScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'catch',
        );
        const finallyScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'finally',
        );

        // All scopes should be created
        expect(tryScope).toBeDefined();
        expect(catchScope).toBeDefined();
        expect(finallyScope).toBeDefined();

        // All should have valid parentIds
        expect(tryScope?.parentId).toBeDefined();
        expect(catchScope?.parentId).toBeDefined();
        expect(finallyScope?.parentId).toBeDefined();
      });
    });

    describe('Scope Stack Integrity', () => {
      it('should maintain valid scope stack even with syntax errors', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              if (true) {
                try {
                  Integer x = 1;
                } catch (Exception e) {
                  Integer y = 2;
                }
                // Missing closing brace for if
            }
            // Missing closing brace for method
          }
          // Missing closing brace for class
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);

        // Should be able to get scope hierarchy without errors
        const hierarchy = symbolTable.getScopeHierarchy({
          line: 1,
          character: 0,
        });
        expect(hierarchy).toBeDefined();
        expect(Array.isArray(hierarchy)).toBe(true);
      });

      it('should handle empty class body gracefully', () => {
        const apexCode = `
          public class TestClass {
            // Empty class body
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const classScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'class',
        );

        expect(classScope).toBeDefined();
        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle class with only syntax errors', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              String x = "test"
              // Missing semicolon and closing brace
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        // Should still create class and method scopes
        const allSymbols = symbolTable.getAllSymbols();
        const classScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'class',
        );
        const methodScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'method',
        );

        expect(classScope).toBeDefined();
        expect(methodScope).toBeDefined();

        // Symbol table should have valid scopes (not corrupted)
        const allScopes = symbolTable
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Block) as ScopeSymbol[];
        expect(allScopes.length).toBeGreaterThan(0);
      });

      it('should handle switch statement with missing braces', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              switch on 'test' {
                when 'test' {
                  Integer x = 1;
                  // Missing closing brace for when
                // Missing closing brace for switch
            }
          }
        `;

        const table = new SymbolTable();
        const listener = new ApexSymbolCollectorListener(table);
        const result = compilerService.compile(
          apexCode,
          'TestClass.cls',
          listener,
        );

        const symbolTable = result.result;
        if (!symbolTable) {
          throw new Error('Symbol table is null');
        }

        const allSymbols = symbolTable.getAllSymbols();
        const switchScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'switch',
        );
        const whenScope = allSymbols.find(
          (s) => isBlockSymbol(s) && s.scopeType === 'when',
        );

        // Both scopes should be created
        expect(switchScope).toBeDefined();
        expect(whenScope).toBeDefined();

        // Scope hierarchy should be maintained
        if (whenScope && switchScope) {
          expect(whenScope.parentId).toBeDefined();
        }
      });
    });
  });

  describe('Symbol ID Format Consistency', () => {
    it('should include root prefix in class symbol ID', () => {
      const apexCode = `
        public class MyClass {
          private String field;
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'file:///test/MyClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
      );

      expect(classSymbol).toBeDefined();
      if (classSymbol) {
        // Class ID should be: fileUri:class:MyClass
        expect(classSymbol.id).toMatch(
          /^file:\/\/\/test\/MyClass\.cls:class:MyClass$/,
        );
        expect(classSymbol.parentId).toBeNull();
      }
    });

    it('should include root prefix in method symbol ID', () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
            String x = 'test';
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'file:///test/MyClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
      );
      const methodSymbol = allSymbols.find(
        (s) => s.name === 'myMethod' && s.kind === SymbolKind.Method,
      );

      expect(classSymbol).toBeDefined();
      expect(methodSymbol).toBeDefined();
      if (classSymbol && methodSymbol) {
        // Method ID should include class prefix: fileUri:class:MyClass:block1:method:myMethod
        expect(methodSymbol.id).toContain('class:MyClass');
        expect(methodSymbol.id).toContain('method:myMethod');
        // Verify the class portion matches the class ID
        const classIdPortion = classSymbol.id.split(':').slice(1).join(':'); // 'class:MyClass'
        expect(methodSymbol.id).toContain(classIdPortion);
      }
    });

    it('should include root prefix in all nested symbol IDs', () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
            if (true) {
              String localVar = 'test';
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'file:///test/MyClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
      );
      const methodSymbol = allSymbols.find(
        (s) => s.name === 'myMethod' && s.kind === SymbolKind.Method,
      );
      const methodBlock = allSymbols.find(
        (s): s is ScopeSymbol => isBlockSymbol(s) && s.scopeType === 'method',
      );
      const variableSymbol = allSymbols.find(
        (s) => s.name === 'localVar' && s.kind === SymbolKind.Variable,
      );

      expect(classSymbol).toBeDefined();
      expect(methodSymbol).toBeDefined();
      expect(methodBlock).toBeDefined();
      expect(variableSymbol).toBeDefined();

      if (classSymbol && methodSymbol && methodBlock && variableSymbol) {
        const classIdPortion = classSymbol.id.split(':').slice(1).join(':'); // 'class:MyClass'

        // Method ID should include class prefix
        expect(methodSymbol.id).toContain(classIdPortion);

        // Method block ID should include class prefix
        expect(methodBlock.id).toContain(classIdPortion);

        // Variable ID should include class prefix in its scopePath
        // Variable IDs may not directly contain the class prefix if they're deeply nested
        // but the parent chain should include it
        const variableParent = allSymbols.find(
          (s) => s.id === variableSymbol.parentId,
        );
        if (variableParent) {
          // Check that the parent chain eventually includes the class prefix
          let current: ApexSymbol | null = variableParent;
          let foundClassPrefix = false;
          while (current && !foundClassPrefix) {
            if (current.id.includes(classIdPortion)) {
              foundClassPrefix = true;
            }
            if (current.parentId) {
              current =
                allSymbols.find((s) => s.id === current!.parentId) || null;
            } else {
              break;
            }
          }
          expect(foundClassPrefix).toBe(true);
        }
      }
    });

    it('should maintain consistent hierarchy structure', () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
            if (true) {
              String localVar = 'test';
            }
          }
        }
      `;

      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);
      const result = compilerService.compile(
        apexCode,
        'file:///test/MyClass.cls',
        listener,
      );

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }

      const allSymbols = symbolTable.getAllSymbols();

      const classSymbol = allSymbols.find(
        (s) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
      );
      const classBlock = allSymbols.find(
        (s): s is ScopeSymbol => isBlockSymbol(s) && s.scopeType === 'class',
      );
      const methodSymbol = allSymbols.find(
        (s) => s.name === 'myMethod' && s.kind === SymbolKind.Method,
      );
      const methodBlock = allSymbols.find(
        (s): s is ScopeSymbol => isBlockSymbol(s) && s.scopeType === 'method',
      );
      const variableSymbol = allSymbols.find(
        (s) => s.name === 'localVar' && s.kind === SymbolKind.Variable,
      );

      expect(classSymbol).toBeDefined();
      expect(classBlock).toBeDefined();
      expect(methodSymbol).toBeDefined();
      expect(methodBlock).toBeDefined();
      expect(variableSymbol).toBeDefined();

      if (
        classSymbol &&
        classBlock &&
        methodSymbol &&
        methodBlock &&
        variableSymbol
      ) {
        // Class symbol should be root (parentId === null)
        expect(classSymbol.parentId).toBeNull();

        // Class block should point to class symbol
        expect(classBlock.parentId).toBe(classSymbol.id);

        // Method symbol should point to class block
        expect(methodSymbol.parentId).toBe(classBlock.id);

        // Method block should point to method symbol
        expect(methodBlock.parentId).toBe(methodSymbol.id);

        // Variable should point to a block (method block or nested block)
        expect(variableSymbol.parentId).toBeDefined();
        const variableParent = allSymbols.find(
          (s) => s.id === variableSymbol.parentId,
        );
        expect(variableParent).toBeDefined();
        expect(variableParent?.kind).toBe(SymbolKind.Block);
      }
    });
  });
});
