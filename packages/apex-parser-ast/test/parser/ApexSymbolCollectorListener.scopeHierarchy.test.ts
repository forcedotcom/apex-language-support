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
import { SymbolTable, SymbolKind } from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';

describe('ApexSymbolCollectorListener - Scope Hierarchy Tests', () => {
  let compilerService: CompilerService;
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.debug('Setting up test environment');
    compilerService = new CompilerService();
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

      // Check the current scope
      const currentScope = symbolTable.getCurrentScope();
      expect(currentScope.name).toBe('file');
      logger.debug(`Current scope name: ${currentScope.name}`);

      // Check child scopes
      const childScopes = currentScope.getChildren();
      // The test should find the class scope as a child of the file scope
      const classScope = childScopes.find(
        (scope) => scope.name === 'CommunitiesLandingController',
      );
      expect(classScope).toBeDefined();
      if (classScope) {
        // Check symbols in the class scope
        const classSymbols = classScope.getAllSymbols();

        // Should have the method and constructor
        const methods = classSymbols.filter(
          (s) => s.kind === SymbolKind.Method,
        );
        const constructors = classSymbols.filter(
          (s) => s.kind === SymbolKind.Constructor,
        );

        expect(methods.length).toBeGreaterThan(0);
        expect(constructors.length).toBeGreaterThan(0);

        // Check for the specific method
        const forwardToStartPageMethod = methods.find(
          (m) => m.name === 'forwardToStartPage',
        );
        expect(forwardToStartPageMethod).toBeDefined();

        // Check for the constructor
        const constructor = constructors.find(
          (c) => c.name === 'CommunitiesLandingController',
        );
        expect(constructor).toBeDefined();
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

      // Check the current scope
      const currentScope = symbolTable.getCurrentScope();
      expect(currentScope.name).toBe('file');
      logger.debug(`Current scope name: ${currentScope.name}`);

      // Check child scopes
      const childScopes = currentScope.getChildren();

      // The test should find the class scope as a child of the file scope
      const classScope = childScopes.find(
        (scope) => scope.name === 'CommunitiesLandingController',
      );
      expect(classScope).toBeDefined();

      if (classScope) {
        // Check symbols in the class scope
        const classSymbols = classScope.getAllSymbols();

        // Should have the method and constructor
        const methods = classSymbols.filter(
          (s) => s.kind === SymbolKind.Method,
        );
        const constructors = classSymbols.filter(
          (s) => s.kind === SymbolKind.Constructor,
        );

        expect(methods.length).toBeGreaterThan(0);
        expect(constructors.length).toBeGreaterThan(0);

        // Check for the specific method
        const forwardToStartPageMethod = methods.find(
          (m) => m.name === 'forwardToStartPage',
        );
        expect(forwardToStartPageMethod).toBeDefined();

        // Check for the constructor
        const constructor = constructors.find(
          (c) => c.name === 'CommunitiesLandingController',
        );
        expect(constructor).toBeDefined();
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

      const currentScope = symbolTable.getCurrentScope();
      const childScopes = currentScope.getChildren();

      const classScope = childScopes.find(
        (scope) => scope.name === 'EmptyClass',
      );
      expect(classScope).toBeDefined();

      if (!classScope) {
        throw new Error('Class scope is null');
      }

      // Class scope only contains members (methods, fields, etc.)
      if (!classScope) {
        throw new Error('Class scope is null');
      }

      expect(classScope.getAllSymbols().length).toBe(0); // Empty class has no members

      // Verify the class symbol is in the file scope
      const fileSymbols = currentScope.getAllSymbols();
      const classSymbol = fileSymbols.find((s) => s.name === 'EmptyClass');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
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

      const currentScope = symbolTable.getCurrentScope();
      const childScopes = currentScope.getChildren();

      const classScope = childScopes.find(
        (scope) => scope.name === 'FieldOnlyClass',
      );
      expect(classScope).toBeDefined();

      if (!classScope) {
        throw new Error('Class scope is null');
      }

      const classSymbols = classScope.getAllSymbols();

      // Class scope contains only the members (fields), not the class itself
      expect(classSymbols.length).toBe(2); // Just the 2 fields

      const fields = classSymbols.filter((s) => s.kind === SymbolKind.Field);
      expect(fields.length).toBe(2);

      // Verify the class symbol is in the file scope
      const fileSymbols = currentScope.getAllSymbols();
      const classSymbol = fileSymbols.find((s) => s.name === 'FieldOnlyClass');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
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

      const currentScope = symbolTable.getCurrentScope();
      const childScopes = currentScope.getChildren();

      const outerClassScope = childScopes.find(
        (scope) => scope.name === 'OuterClass',
      );
      expect(outerClassScope).toBeDefined();

      if (!outerClassScope) {
        throw new Error('Outer class scope is null');
      }

      const outerClassChildren = outerClassScope.getChildren();
      const innerClassScope = outerClassChildren.find(
        (scope) => scope.name === 'InnerClass',
      );
      expect(innerClassScope).toBeDefined();

      if (!innerClassScope) {
        throw new Error('Inner class scope is null');
      }

      const innerClassSymbols = innerClassScope.getAllSymbols();
      const innerMethods = innerClassSymbols.filter(
        (s) => s.kind === SymbolKind.Method,
      );
      expect(innerMethods.length).toBe(1);
    });
  });
});
