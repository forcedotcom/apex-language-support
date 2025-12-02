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
  MethodSymbol,
  ScopeSymbol,
} from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';

describe('ApexSymbolCollectorListener Additional Tests', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('Annotation Handling', () => {
    it('should collect and validate annotations on classes', () => {
      const fileContent = `
        @isTest
        public class TestClass {
          @TestVisible
          private String name;
          
          @isTest
          public static void m1() {
            // Test method implementation
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);
      const symbolTable = result.result;
      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
      const classSymbol = semanticSymbols.find((s) => s.name === 'TestClass');

      expect(classSymbol?.annotations).toBeDefined();
      expect(classSymbol?.annotations?.length).toBe(1);
      expect(classSymbol?.annotations?.[0].name).toBe('isTest');

      // Methods might be in the class scope or in the table - check both
      // getCurrentScope() returns innermost scope, not file scope - find file scope differently
      const fileScope = symbolTable
        ?.getAllSymbols()
        .find(
          (s) => s.kind === SymbolKind.Block && (s as ScopeSymbol).scopeType === 'file',
        ) as ScopeSymbol | undefined;
      const classScope = symbolTable
        ?.getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Block &&
            s.scopeType === 'class' &&
            s.name === 'TestClass',
        ) as ScopeSymbol | undefined;
      const allClassSymbols = classScope
        ? symbolTable.getSymbolsInScope(classScope.id)
        : [];
      const classSemanticSymbols = allClassSymbols.filter((s) => !isBlockSymbol(s));
      let m1 = classSemanticSymbols.find((s) => s.name === 'm1') as MethodSymbol;
      
      // If not found in class scope, check all symbols filtered by parent
      if (!m1 && classSymbol) {
        const allTableSymbols = symbolTable.getAllSymbols();
        const allSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
        m1 = allSemanticSymbols.find(
          (s) => s.name === 'm1' && s.parentId === classSymbol.id,
        ) as MethodSymbol;
      }

      expect(m1).toBeDefined();
      expect(m1?.annotations).toBeDefined();
      expect(m1?.annotations?.length).toBe(1);
      expect(m1?.annotations?.[0].name).toBe('isTest');
    });

    it('should convert @isTest annotation to isTestMethod modifier for classes', () => {
      const fileContent = `@isTest
public class TestClass {
  public static void normalMethod() {
    // Normal method
  }
  
  @isTest
  public static void myTestMethod() {
    // Test method implementation
  }
}`;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }
      expect(result.errors.length).toBe(0);
      const symbolTable = result.result;
      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
      const classSymbol = semanticSymbols.find((s) => s.name === 'TestClass');

      // Verify class has @isTest annotation AND isTestMethod modifier
      expect(classSymbol?.annotations?.[0].name).toBe('isTest');
      expect(classSymbol?.modifiers?.isTestMethod).toBe(true);

      // Methods might be in the class scope or in the table - check both
      const globalScope = symbolTable?.getCurrentScope();
      const classScope = symbolTable
        ?.getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Block &&
            s.scopeType === 'class' &&
            s.name === 'TestClass',
        ) as ScopeSymbol | undefined;
      const allClassSymbols = classScope
        ? symbolTable.getSymbolsInScope(classScope.id)
        : [];
      const classSemanticSymbols = allClassSymbols.filter((s) => !isBlockSymbol(s));
      let normalMethod = classSemanticSymbols.find(
        (s) => s.name === 'normalMethod',
      ) as MethodSymbol;
      let testMethod = classSemanticSymbols.find(
        (s) => s.name === 'myTestMethod',
      ) as MethodSymbol;
      
      // If not found in class scope, check all symbols filtered by parent
      if ((!normalMethod || !testMethod) && classSymbol) {
        const allTableSymbols = symbolTable.getAllSymbols();
        const allSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
        if (!normalMethod) {
          normalMethod = allSemanticSymbols.find(
            (s) => s.name === 'normalMethod' && s.parentId === classSymbol.id,
          ) as MethodSymbol;
        }
        if (!testMethod) {
          testMethod = allSemanticSymbols.find(
            (s) => s.name === 'myTestMethod' && s.parentId === classSymbol.id,
          ) as MethodSymbol;
        }
      }

      // Verify normal method does NOT have isTestMethod modifier
      expect(normalMethod?.modifiers?.isTestMethod).toBe(false);

      // Verify test method has @isTest annotation AND isTestMethod modifier
      expect(testMethod?.annotations?.[0].name).toBe('isTest');
      expect(testMethod?.modifiers?.isTestMethod).toBe(true);
    });

    it('should allow @isTest annotation on private class', () => {
      // This test expects that @isTest annotation acts as an exception to the general
      // rule that private classes are not allowed. Test classes with @isTest should
      // be permitted to have private visibility for test isolation purposes.
      const fileContent = `
        @isTest
        private class PrivateTestClass {
          @isTest
          public static void testSomething() {
            // Test method implementation
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'PrivateTestClass.cls',
        listener,
      );

      // Expected future behavior: @isTest private classes should have no errors
      expect(result.errors.length).toBe(0);

      // Verify the annotation and class were parsed correctly
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();

      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
      const classSymbol = semanticSymbols.find((s) => s.name === 'PrivateTestClass');

      expect(classSymbol).toBeDefined();
      expect(classSymbol?.name).toBe('PrivateTestClass');
      expect(classSymbol?.annotations).toBeDefined();
      expect(classSymbol?.annotations?.length).toBe(1);
      expect(classSymbol?.annotations?.[0].name).toBe('isTest');
    });

    it('should handle annotation parameters', () => {
      const fileContent = `
        @RestResource(urlMapping='/api/records')
        public class TestClass {
          @HttpPost
          public static void handlePost() {
            // Implementation
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);
      const symbolTable = result.result;
      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
      const classSymbol = semanticSymbols.find((s) => s.name === 'TestClass');

      expect(classSymbol?.annotations).toBeDefined();
      expect(classSymbol?.annotations?.length).toBe(1);
      expect(classSymbol?.annotations?.[0].name).toBe(
        "RestResource(urlMapping='/api/records')",
      );
      expect(classSymbol?.annotations?.[0].parameters).toBeDefined();
      expect(classSymbol?.annotations?.[0].parameters?.[0].name).toBe(
        'urlMapping',
      );
      expect(classSymbol?.annotations?.[0].parameters?.[0].value).toBe(
        "'/api/records'",
      );
    });
  });

  describe('Block Scope Handling', () => {
    it('should create scopes for nested blocks', () => {
      const fileContent = `
        public class TestClass {
          public void m1() {
            Integer x = 1;
            {
              Integer y = 2;
              {
                Integer z = 3;
              }
            }
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);
      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }
      const classScope = symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Block &&
            s.scopeType === 'class' &&
            s.name === 'TestClass',
        ) as ScopeSymbol | undefined;
      const methodScope = classScope
        ? symbolTable
            .getSymbolsInScope(classScope.id)
            .find(
              (s) =>
                s.kind === SymbolKind.Block &&
                s.scopeType === 'method' &&
                s.name === 'testMethod',
            )
        : undefined;

      // Get all block scopes
      const blockScopes = methodScope
        ? symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter(
              (s) =>
                s.parentId === methodScope.id &&
                s.kind === SymbolKind.Block &&
                s.scopeType !== 'method',
            ) as ScopeSymbol[]
        : [];
      expect(blockScopes?.length).toBe(1); // One nested block directly under method

      // Check variables in the first block scope (outer block)
      const firstBlock = blockScopes?.[0];
      const firstBlockVars = firstBlock
        ? symbolTable
            .getSymbolsInScope(firstBlock.id)
            .filter((s) => s.kind === SymbolKind.Variable)
        : [];
      expect(firstBlockVars.length).toBe(1); // Only x in the outer block
      expect(firstBlockVars[0]?.name).toBe('x');

      // Check nested block scope
      const nestedBlockScopes = firstBlock
        ? symbolTable
            .getSymbolsInScope(firstBlock.id)
            .filter(
              (s) =>
                s.parentId === firstBlock.id &&
                s.kind === SymbolKind.Block &&
                s.scopeType !== 'method',
            ) as ScopeSymbol[]
        : [];
      expect(nestedBlockScopes.length).toBe(1); // One nested block inside the first block

      // Check variables in the middle block scope
      const middleBlock = nestedBlockScopes?.[0];
      const middleBlockVars = middleBlock
        ? symbolTable
            .getSymbolsInScope(middleBlock.id)
            .filter((s) => s.kind === SymbolKind.Variable)
        : [];
      expect(middleBlockVars.length).toBe(1); // Only y in the middle block
      expect(middleBlockVars[0]?.name).toBe('y');

      // Check innermost block scope
      const innerBlockScopes = middleBlock
        ? symbolTable
            .getSymbolsInScope(middleBlock.id)
            .filter(
              (s) =>
                s.parentId === middleBlock.id &&
                s.kind === SymbolKind.Block &&
                s.scopeType !== 'method',
            ) as ScopeSymbol[]
        : [];
      expect(innerBlockScopes.length).toBe(1); // One nested block inside the middle block

      // Check variables in the innermost block scope
      const innerBlock = innerBlockScopes?.[0];
      const innerBlockVars = innerBlock
        ? symbolTable
            .getSymbolsInScope(innerBlock.id)
            .filter((s) => s.kind === SymbolKind.Variable)
        : [];
      expect(innerBlockVars.length).toBe(1); // Only z in the innermost block
      expect(innerBlockVars?.[0].name).toBe('z');
    });
  });

  describe('Interface Method Validation', () => {
    it('should report error for private interface methods', () => {
      const fileContent = `
        public interface TestInterface {
          private void invalidMethod();
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestInterface.cls',
        listener,
      );

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain(
        'Modifiers are not allowed on interface methods',
      );
    });

    it('should enforce interface method modifiers', () => {
      const fileContent = `
        public interface TestInterface {
          public static void invalidMethod(); // This should cause two errors: explicit modifier and static
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestInterface.cls',
        listener,
      );

      expect(result.errors.length).toBe(2);
      expect(result.errors[0].message).toContain(
        'Modifiers are not allowed on interface methods',
      );
      expect(result.errors[1].message).toContain(
        'Modifiers are not allowed on interface methods',
      );
    });
  });

  describe('Inner Class Validation', () => {
    it('should properly handle inner class declarations', () => {
      const fileContent = `
        public class OuterClass {
          public class InnerClass {
            private String innerField;
            
            public InnerClass() {
              this.innerField = 'test';
            }
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'OuterClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);
      const symbolTable = result.result;
      // Use table.getAllSymbols() to get all symbols including those in file scope
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
      const outerClass = semanticSymbols.find((s) => s.name === 'OuterClass');
      const globalScope = symbolTable?.getCurrentScope();
      const outerScope = symbolTable
        ?.getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Block &&
            s.scopeType === 'class' &&
            s.name === 'OuterClass',
        ) as ScopeSymbol | undefined;
      const allOuterSymbols = outerScope
        ? symbolTable.getSymbolsInScope(outerScope.id)
        : [];
      const outerSemanticSymbols = allOuterSymbols.filter((s) => !isBlockSymbol(s));
      let innerClass = outerSemanticSymbols.find((s) => s.name === 'InnerClass');
      
      // If not found in outer scope, check all symbols filtered by parent
      if (!innerClass && outerClass) {
        const allTableSymbols = symbolTable.getAllSymbols();
        const allSemanticSymbols = allTableSymbols.filter((s) => !isBlockSymbol(s));
        innerClass = allSemanticSymbols.find(
          (s) => s.name === 'InnerClass' && s.parentId === outerClass.id,
        );
      }

      expect(innerClass).toBeDefined();
      // Parent property removed - check parentId instead
      expect(innerClass?.parentId).toBe(outerClass?.id);
      expect(innerClass?.kind).toBe(SymbolKind.Class);
    });

    it('should validate inner class modifiers', () => {
      const fileContent = `
        public class OuterClass {
          global class InnerClass { // This should cause an error
            private String innerField;
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'OuterClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain(
        "Inner class 'InnerClass' cannot have wider visibility than its containing class",
      );
    });
  });
});
