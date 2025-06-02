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
  SymbolVisibility,
  MethodSymbol,
  ApexSymbol,
  SymbolScope,
} from '../../src/types/symbol';
import {
  ErrorType,
  ErrorSeverity,
} from '../../src/parser/listeners/ApexErrorListener';

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

      // Get the file scope
      const fileScope = symbolTable?.getCurrentScope();
      expect(fileScope).toBeDefined();
      expect(fileScope?.name).toBe('file');

      // Check class symbol
      const allSymbols = fileScope?.getAllSymbols();
      expect(allSymbols?.length).toBe(1);

      const classSymbol = allSymbols?.[0];
      expect(classSymbol?.name).toBe('TestClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.modifiers.visibility).toBe(SymbolVisibility.Public);

      // Get class scope
      const classScope = fileScope?.getChildren()[0];
      expect(classScope?.name).toBe('TestClass');

      // Check properties
      const properties = classScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Property);
      expect(properties?.length).toBe(2);

      const nameProperty = properties?.find(
        (p: ApexSymbol) => p.name === 'name',
      );
      expect(nameProperty).toBeDefined();
      expect(nameProperty?.kind).toBe(SymbolKind.Property);

      expect(nameProperty?.modifiers.visibility).toBe(SymbolVisibility.Private);

      const countProperty = properties?.find(
        (p: ApexSymbol) => p.name === 'count',
      );
      expect(countProperty).toBeDefined();
      expect(countProperty?.kind).toBe(SymbolKind.Property);
      expect(countProperty?.modifiers.visibility).toBe(SymbolVisibility.Public);

      // Check methods
      const methods = classScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Method);
      expect(methods?.length).toBe(4); // Constructor, getName, setName, incrementCount

      // Check constructor
      const constructor = methods?.find(
        (m: ApexSymbol) => m.name === 'TestClass',
      ) as MethodSymbol;
      expect(constructor).toBeDefined();
      expect(constructor?.isConstructor).toBe(true);

      // Check getName method
      const getName = methods?.find(
        (m: ApexSymbol) => m.name === 'getName',
      ) as MethodSymbol;
      expect(getName).toBeDefined();
      expect(getName?.modifiers.visibility).toBe(SymbolVisibility.Public);
      expect(getName?.isConstructor).toBe(false);

      // Check setName method
      const setName = methods?.find(
        (m: ApexSymbol) => m.name === 'setName',
      ) as MethodSymbol;
      expect(setName).toBeDefined();
      expect(setName?.isConstructor).toBe(false);

      // Check incrementCount method
      const incrementCount = methods?.find(
        (m: ApexSymbol) => m.name === 'incrementCount',
      ) as MethodSymbol;
      expect(incrementCount).toBeDefined();
      expect(incrementCount?.isConstructor).toBe(false);

      // Check method scope for parameters
      const methodScopes = classScope?.getChildren();
      expect(methodScopes?.length).toBe(4); // One for each method

      // Check setName method parameters
      const setNameScope = methodScopes?.find(
        (s: SymbolScope) => s.name === 'setName',
      );
      expect(setNameScope).toBeDefined();

      const setNameParams = setNameScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Parameter);
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
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check interface symbol
      expect(allSymbols?.length).toBe(1);

      const interfaceSymbol = allSymbols?.[0];
      expect(interfaceSymbol?.name).toBe('TestInterface');
      expect(interfaceSymbol?.kind).toBe(SymbolKind.Interface);
      expect(interfaceSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );

      // Check interface methods
      const interfaceScope = fileScope?.getChildren()[0];
      expect(interfaceScope?.name).toBe('TestInterface');

      const methods = interfaceScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Method);
      expect(methods?.length).toBe(2);

      const getName = methods?.find(
        (m: ApexSymbol) => m.name === 'getName',
      ) as MethodSymbol;
      expect(getName).toBeDefined();
      expect(getName?.modifiers.visibility).toBe(SymbolVisibility.Public);

      const setName = methods?.find(
        (m: ApexSymbol) => m.name === 'setName',
      ) as MethodSymbol;
      expect(setName).toBeDefined();
      expect(setName?.modifiers.visibility).toBe(SymbolVisibility.Public);

      // Check method parameters
      const methodScopes = interfaceScope?.getChildren();
      expect(methodScopes?.length).toBe(2);

      const setNameScope = methodScopes?.find(
        (s: SymbolScope) => s.name === 'setName',
      );
      expect(setNameScope).toBeDefined();

      const setNameParams = setNameScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Parameter);
      expect(setNameParams?.length).toBe(1);

      const nameParam = setNameParams?.[0];
      expect(nameParam?.name).toBe('name');
      expect(nameParam?.kind).toBe(SymbolKind.Parameter);
    });

    it('should collect enum symbols', () => {
      const fileContent = `
        public enum TestEnum {
          VALUE1,
          VALUE2,
          VALUE3
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestEnum.cls',
        listener,
      );

      expect(result.errors).toEqual([]);

      const symbolTable = result.result;
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check enum symbol
      expect(allSymbols?.length).toBe(1);

      const enumSymbol = allSymbols?.[0];
      expect(enumSymbol?.name).toBe('TestEnum');
      expect(enumSymbol?.kind).toBe(SymbolKind.Enum);
      expect(enumSymbol?.modifiers.visibility).toBe(SymbolVisibility.Public);

      // Check enum values
      const enumScope = fileScope?.getChildren()[0];
      expect(enumScope?.name).toBe('TestEnum');

      const values = enumScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.EnumValue);
      expect(values?.length).toBe(3);

      const value1 = values?.find((v: ApexSymbol) => v.name === 'VALUE1');
      expect(value1).toBeDefined();
      expect(value1?.kind).toBe(SymbolKind.EnumValue);

      const value2 = values?.find((v: ApexSymbol) => v.name === 'VALUE2');
      expect(value2).toBeDefined();
      expect(value2?.kind).toBe(SymbolKind.EnumValue);

      const value3 = values?.find((v: ApexSymbol) => v.name === 'VALUE3');
      expect(value3).toBeDefined();
      expect(value3?.kind).toBe(SymbolKind.EnumValue);
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
        new ApexSymbolCollectorListener(),
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getCurrentScope();

      // Navigate to method scope
      const classScope = globalScope?.getChildren()[0];
      const methodScope = classScope?.getChildren()[0];
      expect(methodScope?.name).toBe('testMethod');

      // Helper to recursively collect all variables from all block scopes
      function getAllVariablesFromScopes(scope: SymbolScope): ApexSymbol[] {
        let vars = scope
          .getAllSymbols()
          .filter((s: ApexSymbol) => s.kind === SymbolKind.Variable);
        for (const child of scope.getChildren()) {
          vars = vars.concat(getAllVariablesFromScopes(child));
        }
        return vars;
      }

      const allBlockVariables = getAllVariablesFromScopes(
        methodScope as SymbolScope,
      );
      const varNames = allBlockVariables.map((v: ApexSymbol) => v.name);
      expect(varNames).toContain('outerVar');
      expect(varNames).toContain('innerVar');
      expect(varNames).toContain('loopVar');
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
      const globalScope = symbolTable?.getCurrentScope();

      // Check outer class
      const outerClass = globalScope?.getAllSymbols()[0];
      expect(outerClass?.name).toBe('Outer');

      const outerScope = globalScope?.getChildren()[0];
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
        ?.getChildren()
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

    it('should collect trigger symbols', () => {
      const fileContent = `
        trigger TestTrigger on Account (before insert, after update) {
          // Trigger body
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestTrigger.trigger',
        listener,
      );

      expect(result.errors).toEqual([]);

      const symbolTable = result.result;
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check trigger symbol
      expect(allSymbols?.length).toBe(1);

      const triggerSymbol = allSymbols?.[0];
      expect(triggerSymbol?.name).toBe('TestTrigger');
      expect(triggerSymbol?.kind).toBe(SymbolKind.Trigger);
      expect(triggerSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Default,
      );
    });

    it('should collect nested class symbols', () => {
      const fileContent = `
        public class OuterClass {
          public class InnerClass {
            public void innerMethod() {
              // Method body
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
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check outer class symbol
      expect(allSymbols?.length).toBe(1);

      const outerClassSymbol = allSymbols?.[0];
      expect(outerClassSymbol?.name).toBe('OuterClass');
      expect(outerClassSymbol?.kind).toBe(SymbolKind.Class);
      expect(outerClassSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );

      // Check outer class scope
      const outerClassScope = fileScope?.getChildren()[0];
      expect(outerClassScope?.name).toBe('OuterClass');

      // Check inner class symbol
      const innerClassSymbol = outerClassScope
        ?.getAllSymbols()
        .find((s: ApexSymbol) => s.kind === SymbolKind.Class);
      expect(innerClassSymbol).toBeDefined();
      expect(innerClassSymbol?.name).toBe('InnerClass');
      expect(innerClassSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );

      // Check inner class scope
      const innerClassScope = outerClassScope?.getChildren()[0];
      expect(innerClassScope?.name).toBe('InnerClass');

      // Check inner class method
      const innerMethod = innerClassScope
        ?.getAllSymbols()
        .find((s: ApexSymbol) => s.kind === SymbolKind.Method);
      expect(innerMethod).toBeDefined();
      expect(innerMethod?.name).toBe('innerMethod');
      expect(innerMethod?.modifiers.visibility).toBe(SymbolVisibility.Public);
    });

    it('should collect interface implementation symbols', () => {
      // First compile the interface
      const interfaceContent = `
        public interface TestInterface {
          void doSomething();
        }
      `;

      const interfaceResult: CompilationResult<SymbolTable> =
        compilerService.compile(
          interfaceContent,
          'TestInterface.cls',
          listener,
        );

      expect(interfaceResult.errors.length).toBe(0);

      const interfaceSymbolTable = interfaceResult.result;
      const interfaceFileScope = interfaceSymbolTable?.getCurrentScope();
      const interfaceSymbols = interfaceFileScope?.getAllSymbols();

      // Check interface symbol
      const interfaceSymbol = interfaceSymbols?.[0];
      expect(interfaceSymbol).toBeDefined();
      expect(interfaceSymbol?.name).toBe('TestInterface');
      expect(interfaceSymbol?.kind).toBe(SymbolKind.Interface);
      expect(interfaceSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );

      // Now compile the implementing class with a new listener instance
      const classContent = `
        public class TestClass implements TestInterface {
          public void doSomething() {
            // Implementation
          }
        }
      `;

      const classListener = new ApexSymbolCollectorListener();
      const classResult: CompilationResult<SymbolTable> =
        compilerService.compile(classContent, 'TestClass.cls', classListener);

      expect(classResult.errors.length).toBe(0);

      const classSymbolTable = classResult.result;
      const classFileScope = classSymbolTable?.getCurrentScope();
      const classSymbols = classFileScope?.getAllSymbols();

      // Check class symbol
      const classSymbol = classSymbols?.[0];
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.name).toBe('TestClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.modifiers.visibility).toBe(SymbolVisibility.Public);

      // Check class scope
      const classScope = classFileScope?.getChildren()[0];
      expect(classScope).toBeDefined();
      expect(classScope?.name).toBe('TestClass');

      // Check method implementation
      const method = classScope
        ?.getAllSymbols()
        .find((s: ApexSymbol) => s.kind === SymbolKind.Method);
      expect(method).toBeDefined();
      expect(method?.name).toBe('doSomething');
      expect(method?.modifiers.visibility).toBe(SymbolVisibility.Public);
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

      console.log(`result.errors: ${JSON.stringify(result.errors)}`);
      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

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
        'Modifiers are not allowed on interface methods',
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
        'Duplicate interface method declaration',
      );
      expect(semanticErrors[0].message).toContain('interface');
    });
  });
});
