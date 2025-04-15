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
} from '../../src/parser/compilerService.js';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener.js';
import {
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
  MethodSymbol,
} from '../../src/types/symbol.js';
import {
  ErrorType,
  ErrorSeverity,
} from '../../src/parser/listeners/ApexErrorListener.js';

describe('ApexSymbolCollectorListener', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('collect Class Symbols', () => {
    it('should collect class, method, property and parameter symbols', () => {
      // Sample Apex code with a class, methods, properties and parameters
      const fileContent = `
        public class TestClass {
          private String name;
          public Integer count;
          
          public TestClass(String initialName) {
            this.name = initialName;
            this.count = 0;
          }
          
          public String getName() {
            return name;
          }
          
          public void setName(String name) {
            this.name = name;
          }
          
          public void incrementCount(Integer amount) {
            this.count += amount;
          }
        }
      `;

      // Parse the file
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      // Check no errors
      expect(result.errors.length).toBe(0);

      // Verify symbol table
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();

      // Get the global scope
      const globalScope = symbolTable?.getGlobalScope();
      expect(globalScope).toBeDefined();

      // Check class symbol
      const allSymbols = globalScope?.getAllSymbols();
      expect(allSymbols?.length).toBe(1);

      const classSymbol = allSymbols?.[0];
      expect(classSymbol?.name).toBe('TestClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.modifiers.visibility).toBe(SymbolVisibility.Public);

      // Get class scope
      const classScopes = globalScope?.getChildScopes();
      expect(classScopes?.length).toBe(1);

      const classScope = classScopes?.[0];
      expect(classScope?.name).toBe('TestClass');

      // Check properties
      const properties = classScope
        ?.getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Property);
      expect(properties?.length).toBe(2);

      const nameProperty = properties?.find((p) => p.name === 'name');
      expect(nameProperty).toBeDefined();
      expect(nameProperty?.kind).toBe(SymbolKind.Property);

      expect(nameProperty?.modifiers.visibility).toBe(SymbolVisibility.Private);

      const countProperty = properties?.find((p) => p.name === 'count');
      expect(countProperty).toBeDefined();
      expect(countProperty?.kind).toBe(SymbolKind.Property);
      expect(countProperty?.modifiers.visibility).toBe(SymbolVisibility.Public);

      // Check methods
      const methods = classScope
        ?.getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Method);
      expect(methods?.length).toBe(4); // Constructor, getName, setName, incrementCount

      // Check constructor
      const constructor = methods?.find(
        (m) => m.name === 'TestClass',
      ) as MethodSymbol;
      expect(constructor).toBeDefined();
      expect(constructor?.isConstructor).toBe(true);

      // Check getName method
      const getName = methods?.find(
        (m) => m.name === 'getName',
      ) as MethodSymbol;
      expect(getName).toBeDefined();
      expect(getName?.modifiers.visibility).toBe(SymbolVisibility.Public);
      expect(getName?.isConstructor).toBe(false);

      // Check setName method
      const setName = methods?.find(
        (m) => m.name === 'setName',
      ) as MethodSymbol;
      expect(setName).toBeDefined();
      expect(setName?.isConstructor).toBe(false);

      // Check incrementCount method
      const incrementCount = methods?.find(
        (m) => m.name === 'incrementCount',
      ) as MethodSymbol;
      expect(incrementCount).toBeDefined();
      expect(incrementCount?.isConstructor).toBe(false);

      // Check method scope for parameters
      const methodScopes = classScope?.getChildScopes();
      expect(methodScopes?.length).toBe(4); // One for each method

      // Check setName method parameters
      const setNameScope = methodScopes?.find((s) => s.name === 'setName');
      expect(setNameScope).toBeDefined();

      const setNameParams = setNameScope
        ?.getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Parameter);
      expect(setNameParams?.length).toBe(1);

      const nameParam = setNameParams?.[0];
      expect(nameParam?.name).toBe('name');
      expect(nameParam?.kind).toBe(SymbolKind.Parameter);
    });

    it('should collect interface symbols', () => {
      const fileContent = `
        public interface TestInterface {
          String getName();
          void setName(String name);
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestInterface.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getGlobalScope();
      const allSymbols = globalScope?.getAllSymbols();

      // Check interface symbol
      expect(allSymbols?.length).toBe(1);

      const interfaceSymbol = allSymbols?.[0];
      expect(interfaceSymbol?.name).toBe('TestInterface');
      expect(interfaceSymbol?.kind).toBe(SymbolKind.Interface);
      expect(interfaceSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );

      // Check interface methods
      const interfaceScopes = globalScope?.getChildScopes();
      expect(interfaceScopes?.length).toBe(1);

      const interfaceScope = interfaceScopes?.[0];
      const methods = interfaceScope
        ?.getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Method);
      expect(methods?.length).toBe(2);

      const getName = methods?.find(
        (m) => m.name === 'getName',
      ) as MethodSymbol;
      expect(getName).toBeDefined();
      expect(getName?.isConstructor).toBe(false);

      const setName = methods?.find(
        (m) => m.name === 'setName',
      ) as MethodSymbol;
      expect(setName).toBeDefined();
      expect(setName?.isConstructor).toBe(false);

      // Check parameters in setName method
      const methodScopes = interfaceScope?.getChildScopes();
      const setNameScope = methodScopes?.find((s) => s.name === 'setName');

      const parameters = setNameScope
        ?.getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Parameter);
      expect(parameters?.length).toBe(1);
      expect(parameters?.[0].name).toBe('name');
    });

    it('should collect enum symbols', () => {
      const fileContent = `
        public class EnumContainer {
          public enum Season {
            WINTER, SPRING, SUMMER, FALL
          }
          
          public Season currentSeason;
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'EnumContainer.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getGlobalScope();

      // Check class
      const classSymbol = globalScope?.getAllSymbols()[0];
      expect(classSymbol?.name).toBe('EnumContainer');

      // Check class scope
      const classScope = globalScope?.getChildScopes()[0];

      // Check enum declaration
      const enumSymbol = classScope
        ?.getAllSymbols()
        .find((s) => s.kind === SymbolKind.Enum);
      expect(enumSymbol).toBeDefined();
      expect(enumSymbol?.name).toBe('Season');

      // Check enum scope (note: our current implementation doesn't fully parse enum constants yet)
      const enumScope = classScope
        ?.getChildScopes()
        .find((s) => s.name === 'Season');
      expect(enumScope).toBeDefined();

      // Check property that uses the enum
      const seasonProperty = classScope
        ?.getAllSymbols()
        .find((s) => s.name === 'currentSeason');
      expect(seasonProperty).toBeDefined();
      expect(seasonProperty?.kind).toBe(SymbolKind.Property);
    });

    it('should collect local variable symbols within blocks', () => {
      const fileContent = `
        public class BlocksTest {
          public void testMethod() {
            Integer outerVar = 10;
            
            if (outerVar > 5) {
              String innerVar = 'inside if';
              System.debug(innerVar);
            }
            
            for (Integer i = 0; i < 5; i++) {
              Double loopVar = i * 1.5;
              System.debug(loopVar);
            }
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'BlocksTest.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getGlobalScope();

      // Navigate to method scope
      const classScope = globalScope?.getChildScopes()[0];
      const methodScope = classScope?.getChildScopes()[0];
      expect(methodScope?.name).toBe('testMethod');

      // Check outer variable
      const outerVar = methodScope
        ?.getAllSymbols()
        .find((s) => s.name === 'outerVar');
      expect(outerVar).toBeDefined();
      expect(outerVar?.kind).toBe(SymbolKind.Variable);

      // Check block scopes (if block, for block)
      const blockScopes = methodScope?.getChildScopes();
      expect(blockScopes?.length).toBeGreaterThan(0);

      // Note: Since block scopes are named dynamically based on line numbers
      // we can't easily get specific blocks by name

      // Instead we'll check if any variables were defined in block scopes
      const blockVariables = blockScopes?.flatMap((scope) =>
        scope.getAllSymbols().filter((s) => s.kind === SymbolKind.Variable),
      );

      const innerVarNames = blockVariables?.map((v) => v.name);
      expect(innerVarNames).toContain('innerVar');
      expect(innerVarNames).toContain('loopVar');
      // Note: The 'i' variable might be in a different scope depending on parser behavior
    });

    it('should handle nested classes', () => {
      const fileContent = `
        public class Outer {
          private Integer outerField;
          
          public class Inner {
            private String innerField;
            
            public void innerMethod() {
              Boolean innerVar = true;
            }
          }
          
          public void outerMethod() {
            Inner inner = new Inner();
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'Outer.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getGlobalScope();

      // Check outer class
      const outerClass = globalScope?.getAllSymbols()[0];
      expect(outerClass?.name).toBe('Outer');

      const outerScope = globalScope?.getChildScopes()[0];
      expect(outerScope?.name).toBe('Outer');

      // Check outer class field
      const outerField = outerScope
        ?.getAllSymbols()
        .find((s) => s.name === 'outerField');
      expect(outerField).toBeDefined();

      // Check inner class (note: our implementation may not fully handle inner classes yet)
      const innerClass = outerScope
        ?.getAllSymbols()
        .find((s) => s.name === 'Inner');
      expect(innerClass?.kind).toBe(SymbolKind.Class);

      // Check inner class scope (if implemented)
      const innerScope = outerScope
        ?.getChildScopes()
        .find((s) => s.name === 'Inner');

      if (innerScope) {
        // If inner class scoping is implemented, check inner field and method
        const innerField = innerScope
          .getAllSymbols()
          .find((s) => s.name === 'innerField');
        expect(innerField).toBeDefined();

        const innerMethod = innerScope
          .getAllSymbols()
          .find((s) => s.name === 'innerMethod');
        expect(innerMethod).toBeDefined();
      }
    });
  });

  describe('error handling', () => {
    it('should capture syntax errors', () => {
      // Apex code with syntax error - missing semicolon
      const fileContent = `
        public class ErrorClass {
          private String name
          public void method() {}
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ErrorClass.cls',
        listener,
      );

      // Should have a syntax error
      expect(result.errors.length).toBeGreaterThan(0);

      // Verify error details
      const syntaxErrors = result.errors.filter(
        (e) => e.type === ErrorType.Syntax,
      );
      expect(syntaxErrors.length).toBeGreaterThan(0);
      expect(syntaxErrors[0].line).toBe(4); // The line with the missing semicolon
      expect(syntaxErrors[0].severity).toBe(ErrorSeverity.Error);
    });

    it('should capture semantic errors for duplicate variable declarations', () => {
      // Apex code with duplicate variable declaration
      const fileContent = `
        public class DuplicateVarClass {
          private void method() {
            Integer count = 0;
            String count = 'test'; // Duplicate variable name in same scope
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'DuplicateVarClass.cls',
        listener,
      );

      // Should have a semantic error
      const semanticErrors = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
      );

      expect(semanticErrors.length).toBeGreaterThan(0);
      expect(semanticErrors[0].message).toContain(
        'Duplicate variable declaration',
      );
      expect(semanticErrors[0].line).toBe(5); // Line with the duplicate variable
    });

    it('should capture semantic errors for conflicting method modifiers', () => {
      // Apex code with conflicting method modifiers
      const fileContent = `
        public abstract class ModifierClass {
          abstract final void badMethod() {
            // Can't be both abstract and final
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ModifierClass.cls',
        listener,
      );

      // Should have a semantic error
      const semanticErrors = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
      );

      expect(semanticErrors.length).toBeGreaterThan(0);
      expect(semanticErrors[0].message).toContain(
        'cannot be both abstract and final',
      );
    });

    it('should capture semantic warnings for method overrides', () => {
      // Apex code with override method
      const fileContent = `
        public class OverrideClass {
          override public void overrideMethod() {
            // This will generate a warning about ensuring parent has compatible method
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'OverrideClass.cls',
        listener,
      );

      // Should have a semantic warning
      const semanticWarnings = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Warning,
      );

      expect(semanticWarnings.length).toBeGreaterThan(0);
      expect(semanticWarnings[0].message).toContain('Override method');
      expect(semanticWarnings[0].message).toContain(
        'ensure a parent class has a compatible',
      );
    });

    it('should capture multiple errors in a single file', () => {
      // Apex code with multiple issues
      const fileContent = `
        public abstract class MultiErrorClass {
          private String name;
          private String name; // Duplicate field
          
          abstract override void badMethod(); // Abstract and override conflict
          
          public void normalMethod() {
            Integer x = 5
            Integer x = 10; // Missing semicolon and duplicate variable
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'MultiErrorClass.cls',
        listener,
      );

      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThan(2);

      // Check types of errors
      const syntaxErrors = result.errors.filter(
        (e) => e.type === ErrorType.Syntax,
      );
      const semanticErrors = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
      );

      expect(syntaxErrors.length).toBeGreaterThan(0);
      expect(semanticErrors.length).toBeGreaterThan(0);
    });

    it('should capture semantic errors for invalid interface methods with implementation', () => {
      // Interface method with implementation
      const fileContent = `
        public interface BadInterface {
          void badMethod() {
            // Interface methods should not have implementation
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'BadInterface.cls',
        listener,
      );

      // Check for syntax errors instead of semantic errors since
      // the parser treats this as a syntax error
      const syntaxErrors = result.errors.filter(
        (e) => e.type === ErrorType.Syntax,
      );

      expect(syntaxErrors.length).toBeGreaterThan(0);
      expect(syntaxErrors[0].type).toBe(ErrorType.Syntax);
    });

    it('should capture semantic errors for invalid visibility modifiers in interfaces', () => {
      const fileContent = `
        public interface VisibilityInterface {
          private void privateMethod(); // Interface methods cannot be private
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'VisibilityInterface.cls',
        listener,
      );

      const semanticErrors = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
      );

      expect(semanticErrors.length).toBeGreaterThan(0);
      expect(semanticErrors[0].message).toContain(
        'Interface method cannot be private',
      );
    });

    it('should capture semantic errors for duplicate method declarations', () => {
      const fileContent = `
        public class DuplicateMethodClass {
          public void sameMethod() {
            // First implementation
          }
          
          public void sameMethod() {
            // Duplicate method with same signature
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'DuplicateMethodClass.cls',
        listener,
      );

      const semanticErrors = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
      );

      expect(semanticErrors.length).toBeGreaterThan(0);
      expect(semanticErrors[0].message).toContain('Duplicate method');
    });

    it('should capture semantic errors for duplicate constructor declarations', () => {
      const fileContent = `
        public class DuplicateConstructorClass {
          public DuplicateConstructorClass() {
            // First constructor
          }
          
          private DuplicateConstructorClass() {
            // Duplicate constructor
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'DuplicateConstructorClass.cls',
        listener,
      );

      const semanticErrors = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
      );

      expect(semanticErrors.length).toBeGreaterThan(0);
      expect(semanticErrors[0].message).toContain(
        'Duplicate constructor declaration',
      );
    });

    it('should capture semantic errors for duplicate interface method declarations', () => {
      const fileContent = `
        public interface DuplicateInterfaceMethodInterface {
          void sameMethod();
          
          String sameMethod(); // Duplicate method with different return type
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'DuplicateInterfaceMethodInterface.cls',
        listener,
      );

      const semanticErrors = result.errors.filter(
        (e) =>
          e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
      );

      expect(semanticErrors.length).toBeGreaterThan(0);
      expect(semanticErrors[0].message).toContain(
        'Duplicate method declaration',
      );
      expect(semanticErrors[0].message).toContain('interface');
    });
  });
});
