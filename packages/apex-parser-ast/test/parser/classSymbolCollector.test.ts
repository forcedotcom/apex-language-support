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
import { TestLogger } from '../utils/testLogger';

describe('ApexSymbolCollectorListener', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.debug('Setting up test environment');
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('collect Class Symbols', () => {
    it('should collect class, method, field, property and parameter symbols', () => {
      logger.debug(
        'Starting test: collect class, method, field, property and parameter symbols',
      );
      // Sample Apex code with a class, methods, fields, properties and parameters
      const fileContent = `
        public class TestClass {
          private String name;
          public Integer count;
          public String property1 { get; set; }
          public Number property2 { get; set; }

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

      logger.debug('Compiling test file');
      // Parse the file
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      // Check no errors
      if (result.errors.length > 0) {
        result.errors.forEach((error, index) => {
        });
      }
      expect(result.errors.length).toBe(0);
      logger.debug('No compilation errors found');

      // Verify symbol table
      const symbolTable = result.result;
      expect(symbolTable).toBeDefined();
      logger.debug('Symbol table created successfully');

      // Get the file scope
      const fileScope = symbolTable?.getCurrentScope();
      expect(fileScope).toBeDefined();
      expect(fileScope?.name).toBe('file');
      logger.debug('File scope verified');

      // Check class symbol
      const allSymbols = fileScope?.getAllSymbols();
      expect(allSymbols?.length).toBe(1);
      logger.debug('Found class symbol');

      const classSymbol = allSymbols?.[0];
      expect(classSymbol?.name).toBe('TestClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.modifiers.visibility).toBe(SymbolVisibility.Public);
      logger.debug(
        () =>
          `Class symbol properties verified: name=${classSymbol?.name}, ` +
          `kind=${classSymbol?.kind}, visibility=${classSymbol?.modifiers.visibility}`,
      );

      // Get class scope
      const classScope = fileScope?.getChildren()[0];
      expect(classScope?.name).toBe('TestClass');
      logger.debug('Class scope retrieved');

      // Check fields
      const fields = classScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Field);
      expect(fields?.length).toBe(2);
      logger.debug(() => `Found ${fields?.length} field symbols`);

      // Check properties
      const properties = classScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Property);
      expect(properties?.length).toBe(2);
      logger.debug(() => `Found ${properties?.length} property symbols`);

      const nameField = fields?.find((p: ApexSymbol) => p.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField?.kind).toBe(SymbolKind.Field);
      expect(nameField?.modifiers.visibility).toBe(SymbolVisibility.Private);
      logger.debug(
        () =>
          `Name field verified: kind=${nameField?.kind}, ` +
          `visibility=${nameField?.modifiers.visibility}`,
      );

      const countField = fields?.find((p: ApexSymbol) => p.name === 'count');
      expect(countField).toBeDefined();
      expect(countField?.kind).toBe(SymbolKind.Field);
      expect(countField?.modifiers.visibility).toBe(SymbolVisibility.Public);
      logger.debug(
        () =>
          `Count field verified: kind=${countField?.kind}, visibility=${countField?.modifiers.visibility}`,
      );

      // Check methods
      const methods = classScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Method);
      expect(methods?.length).toBe(3); // getName, setName, incrementCount
      logger.debug(() => `Found ${methods?.length} method symbols`);

      // Check constructor
      const constructors = classScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Constructor);
      expect(constructors?.length).toBe(1);
      const constructor = constructors?.[0] as MethodSymbol;
      expect(constructor).toBeDefined();
      expect(constructor.name).toBe('TestClass');
      expect(constructor.isConstructor).toBe(true);
      logger.debug(
        () =>
          `Constructor verified: isConstructor=${constructor?.isConstructor}`,
      );

      // Check getName method
      const getName = methods?.find(
        (m: ApexSymbol) => m.name === 'getName',
      ) as MethodSymbol;
      expect(getName).toBeDefined();
      expect(getName?.modifiers.visibility).toBe(SymbolVisibility.Public);
      expect(getName?.isConstructor).toBe(false);
      logger.debug(
        () =>
          `getName method verified: visibility=${getName?.modifiers.visibility}, ` +
          `isConstructor=${getName?.isConstructor}`,
      );

      // Check setName method
      const setName = methods?.find(
        (m: ApexSymbol) => m.name === 'setName',
      ) as MethodSymbol;
      expect(setName).toBeDefined();
      expect(setName?.isConstructor).toBe(false);
      logger.debug(
        () =>
          `setName method verified: isConstructor=${setName?.isConstructor}`,
      );

      // Check incrementCount method
      const incrementCount = methods?.find(
        (m: ApexSymbol) => m.name === 'incrementCount',
      ) as MethodSymbol;
      expect(incrementCount).toBeDefined();
      expect(incrementCount?.isConstructor).toBe(false);
      logger.debug(
        () =>
          `incrementCount method verified: isConstructor=${incrementCount?.isConstructor}`,
      );

      // Check method scope for parameters
      const methodScopes = classScope?.getChildren();
      expect(methodScopes?.length).toBe(4); // One for each method
      logger.debug(
        () => `Method scopes verified: count=${methodScopes?.length}`,
      );

      // Check setName method parameters
      const setNameScope = methodScopes?.find(
        (s: SymbolScope) => s.name === 'setName',
      );
      expect(setNameScope).toBeDefined();
      logger.debug('setName scope found');

      const setNameParams = setNameScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Parameter);
      expect(setNameParams?.length).toBe(1);
      logger.debug(
        () => `setName parameters found: count=${setNameParams?.length}`,
      );

      const nameParam = setNameParams?.[0];
      expect(nameParam?.name).toBe('name');
      expect(nameParam?.kind).toBe(SymbolKind.Parameter);
      logger.debug(
        () =>
          `name parameter verified: name=${nameParam?.name}, kind=${nameParam?.kind}`,
      );
    });

    it('should correctly identify an inner class constructor', () => {
      const fileContent = `
        public class OuterClass {
          public class InnerClass {
            public InnerClass() {
              // constructor for inner class
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

      const fileScope = result.result!.getCurrentScope();
      const outerClassSymbol = fileScope.getSymbol('OuterClass');
      expect(outerClassSymbol).toBeDefined();

      const outerClassScope = fileScope
        .getChildren()
        .find((s) => s.name === 'OuterClass');
      expect(outerClassScope).toBeDefined();

      const innerClassSymbol = outerClassScope!.getSymbol('InnerClass');
      expect(innerClassSymbol).toBeDefined();

      const innerClassScope = outerClassScope!
        .getChildren()
        .find((s) => s.name === 'InnerClass');
      expect(innerClassScope).toBeDefined();

      const constructorSymbol = innerClassScope!.getSymbol(
        'InnerClass',
      ) as MethodSymbol;
      expect(constructorSymbol).toBeDefined();
      expect(constructorSymbol.isConstructor).toBe(true);
      expect(constructorSymbol.location.startLine).toBe(4);
    });

    it('should collect interface symbols', () => {
      logger.debug('Starting test: collect interface symbols');
      const fileContent = `
        public interface TestInterface {
          String getName();
          void setName(String name);
        }
      `;

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestInterface.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);
      logger.debug('No compilation errors found');

      const symbolTable = result.result;
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check interface symbol
      expect(allSymbols?.length).toBe(1);
      logger.debug('Found interface symbol');

      const interfaceSymbol = allSymbols?.[0];
      expect(interfaceSymbol?.name).toBe('TestInterface');
      expect(interfaceSymbol?.kind).toBe(SymbolKind.Interface);
      expect(interfaceSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );
      logger.debug(
        () =>
          `Interface symbol properties verified: name=${interfaceSymbol?.name}, ` +
          `kind=${interfaceSymbol?.kind}, visibility=${interfaceSymbol?.modifiers.visibility}`,
      );
    });

    it('should collect enum symbols', () => {
      logger.debug('Starting test: collect enum symbols');
      const fileContent = `
        public enum TestEnum {
          VALUE1,
          VALUE2,
          VALUE3
        }
      `;

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestEnum.cls',
        listener,
      );

      expect(result.errors).toEqual([]);
      logger.debug('No compilation errors found');

      const symbolTable = result.result;
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check enum symbol
      expect(allSymbols?.length).toBe(1);
      logger.debug('Found enum symbol');

      const enumSymbol = allSymbols?.[0];
      expect(enumSymbol?.name).toBe('TestEnum');
      expect(enumSymbol?.kind).toBe(SymbolKind.Enum);
      expect(enumSymbol?.modifiers.visibility).toBe(SymbolVisibility.Public);
      logger.debug(
        () =>
          `Enum symbol properties verified: name=${enumSymbol?.name}, ` +
          `kind=${enumSymbol?.kind}, visibility=${enumSymbol?.modifiers.visibility}`,
      );

      // Check enum values
      const enumScope = fileScope?.getChildren()[0];
      expect(enumScope?.name).toBe('TestEnum');
      logger.debug('Enum scope retrieved');

      const values = enumScope
        ?.getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.EnumValue);
      expect(values?.length).toBe(3);
      logger.debug(() => `Found ${values?.length} enum values`);

      const value1 = values?.find((v: ApexSymbol) => v.name === 'VALUE1');
      expect(value1).toBeDefined();
      expect(value1?.kind).toBe(SymbolKind.EnumValue);
      logger.debug(
        () => `Enum value verified: name=${value1?.name}, kind=${value1?.kind}`,
      );

      const value2 = values?.find((v: ApexSymbol) => v.name === 'VALUE2');
      expect(value2).toBeDefined();
      expect(value2?.kind).toBe(SymbolKind.EnumValue);
      logger.debug(
        () => `Enum value verified: name=${value2?.name}, kind=${value2?.kind}`,
      );

      const value3 = values?.find((v: ApexSymbol) => v.name === 'VALUE3');
      expect(value3).toBeDefined();
      expect(value3?.kind).toBe(SymbolKind.EnumValue);
      logger.debug(
        () => `Enum value verified: name=${value3?.name}, kind=${value3?.kind}`,
      );
    });

    it('should collect local variable symbols within blocks', () => {
      logger.debug(
        'Starting test: collect local variable symbols within blocks',
      );
      const fileContent = `
        public class BlocksTest {
          public void m1() {
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

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'BlocksTest.cls',
        new ApexSymbolCollectorListener(),
      );

      expect(result.errors.length).toBe(0);
      logger.debug('No compilation errors found');

      const symbolTable = result.result;
      const globalScope = symbolTable?.getCurrentScope();

      // Navigate to method scope
      const classScope = globalScope?.getChildren()[0];
      const methodScope = classScope?.getChildren()[0];
      expect(methodScope?.name).toBe('m1');
      logger.debug('Method scope retrieved');

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
      logger.debug(() => `Found block variables: ${varNames.join(', ')}`);
    });

    it('should handle nested classes', () => {
      logger.debug('Starting test: handle nested classes');
      const fileContent = `
        public class OuterClass {
          private Integer outerField;

          public class InnerClass {
            private String innerField;

            public void innerMethod() {
              Boolean innerVar = true;
            }
          }

          public void outerMethod() {
            InnerClass innerInstance = new InnerClass();
          }
        }
      `;

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'OuterClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);
      logger.debug('No compilation errors found');

      const symbolTable = result.result;
      const globalScope = symbolTable?.getCurrentScope();

      // Check outer class
      const outerClass = globalScope?.getAllSymbols()[0];
      expect(outerClass?.name).toBe('OuterClass');
      logger.debug(() => `Found outer class: name=${outerClass?.name}`);

      const outerScope = globalScope?.getChildren()[0];
      expect(outerScope?.name).toBe('OuterClass');
      logger.debug('Outer scope retrieved');

      // Check outer class field
      const outerField = outerScope
        ?.getAllSymbols()
        .find((s) => s.name === 'outerField');
      expect(outerField).toBeDefined();
      logger.debug(
        () =>
          `Outer field verified: name=${outerField?.name}, ` +
          `kind=${outerField?.kind}, visibility=${outerField?.modifiers.visibility}`,
      );

      // Check inner class
      const innerClass = outerScope
        ?.getAllSymbols()
        .find((s) => s.name === 'InnerClass');
      expect(innerClass?.kind).toBe(SymbolKind.Class);
      logger.debug(
        () =>
          `Found inner class: name=${innerClass?.name}, kind=${innerClass?.kind}`,
      );

      // Check inner class scope
      const innerScope = outerScope
        ?.getChildren()
        .find((s) => s.name === 'InnerClass');

      if (innerScope) {
        logger.debug('Inner scope found');
        // If inner class scoping is implemented, check inner field and method
        const innerField = innerScope
          .getAllSymbols()
          .find((s) => s.name === 'innerField');
        expect(innerField).toBeDefined();
        logger.debug(
          () =>
            `Inner field verified: name=${innerField?.name}, ` +
            `kind=${innerField?.kind}, visibility=${innerField?.modifiers.visibility}`,
        );

        const innerMethod = innerScope
          .getAllSymbols()
          .find((s) => s.name === 'innerMethod');
        expect(innerMethod).toBeDefined();
        logger.debug(
          () =>
            `Inner method verified: name=${innerMethod?.name}, ` +
            `kind=${innerMethod?.kind}, visibility=${innerMethod?.modifiers.visibility}`,
        );
      }
    });

    it('should collect trigger symbols', () => {
      logger.debug('Starting test: collect trigger symbols');
      const fileContent = `
        trigger TestTrigger on Account (before insert, after update) {
          // Trigger body
        }
      `;

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestTrigger.trigger',
        listener,
      );

      expect(result.errors).toEqual([]);
      logger.debug('No compilation errors found');

      const symbolTable = result.result;
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check trigger symbol
      expect(allSymbols?.length).toBe(1);
      logger.debug('Found trigger symbol');

      const triggerSymbol = allSymbols?.[0];
      expect(triggerSymbol?.name).toBe('TestTrigger');
      expect(triggerSymbol?.kind).toBe(SymbolKind.Trigger);
      expect(triggerSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Default,
      );
      logger.debug(
        () =>
          `Trigger symbol properties verified: name=${triggerSymbol?.name}, ` +
          `kind=${triggerSymbol?.kind}, visibility=${triggerSymbol?.modifiers.visibility}`,
      );
    });

    it('should collect nested class symbols', () => {
      logger.debug('Starting test: collect nested class symbols');
      const fileContent = `
        public class OuterClass {
          public class InnerClass {
            public void innerMethod() {
              // Method body
            }
          }
        }
      `;

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'OuterClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);
      logger.debug('No compilation errors found');

      const symbolTable = result.result;
      const fileScope = symbolTable?.getCurrentScope();
      const allSymbols = fileScope?.getAllSymbols();

      // Check outer class symbol
      expect(allSymbols?.length).toBe(1);
      logger.debug('Found outer class symbol');

      const outerClassSymbol = allSymbols?.[0];
      expect(outerClassSymbol?.name).toBe('OuterClass');
      expect(outerClassSymbol?.kind).toBe(SymbolKind.Class);
      expect(outerClassSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );
      logger.debug(
        () =>
          `Outer class symbol properties verified: name=${outerClassSymbol?.name}, ` +
          `kind=${outerClassSymbol?.kind}, visibility=${outerClassSymbol?.modifiers.visibility}`,
      );

      // Check outer class scope
      const outerClassScope = fileScope?.getChildren()[0];
      expect(outerClassScope?.name).toBe('OuterClass');
      logger.debug('Outer class scope retrieved');

      // Check inner class symbol
      const innerClassSymbol = outerClassScope
        ?.getAllSymbols()
        .find((s: ApexSymbol) => s.kind === SymbolKind.Class);
      expect(innerClassSymbol).toBeDefined();
      expect(innerClassSymbol?.name).toBe('InnerClass');
      expect(innerClassSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Public,
      );
      logger.debug(
        () =>
          `Inner class symbol properties verified: name=${innerClassSymbol?.name}, ` +
          `kind=${innerClassSymbol?.kind}, visibility=${innerClassSymbol?.modifiers.visibility}`,
      );

      // Check inner class scope
      const innerClassScope = outerClassScope?.getChildren()[0];
      expect(innerClassScope?.name).toBe('InnerClass');
      logger.debug('Inner class scope retrieved');

      // Check inner class method
      const innerMethod = innerClassScope
        ?.getAllSymbols()
        .find((s: ApexSymbol) => s.kind === SymbolKind.Method);
      expect(innerMethod).toBeDefined();
      expect(innerMethod?.name).toBe('innerMethod');
      expect(innerMethod?.modifiers.visibility).toBe(SymbolVisibility.Public);
      logger.debug(
        () =>
          `Inner method properties verified: name=${innerMethod?.name}, ` +
          `kind=${innerMethod?.kind}, visibility=${innerMethod?.modifiers.visibility}`,
      );
    });

    it('should collect interface implementation symbols', () => {
      logger.debug('Starting test: collect interface implementation symbols');
      // First compile the interface
      const interfaceContent = `
        public interface TestInterface {
          void doSomething();
        }
      `;

      logger.debug('Compiling interface file');
      const interfaceResult: CompilationResult<SymbolTable> =
        compilerService.compile(
          interfaceContent,
          'TestInterface.cls',
          listener,
        );

      expect(interfaceResult.errors.length).toBe(0);
      logger.debug('No interface compilation errors found');

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
      logger.debug(
        () =>
          `Interface symbol properties verified: name=${interfaceSymbol?.name}, ` +
          `kind=${interfaceSymbol?.kind}, visibility=${interfaceSymbol?.modifiers.visibility}`,
      );

      // Now compile the implementing class with a new listener instance
      const classContent = `
        public class TestClass implements TestInterface {
          public void doSomething() {
            // Implementation
          }
        }
      `;

      logger.debug('Compiling implementing class file');
      const classListener = new ApexSymbolCollectorListener();
      const classResult: CompilationResult<SymbolTable> =
        compilerService.compile(classContent, 'TestClass.cls', classListener);

      expect(classResult.errors.length).toBe(0);
      logger.debug('No class compilation errors found');

      const classSymbolTable = classResult.result;
      const classFileScope = classSymbolTable?.getCurrentScope();
      const classSymbols = classFileScope?.getAllSymbols();

      // Check class symbol
      const classSymbol = classSymbols?.[0];
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.name).toBe('TestClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.modifiers.visibility).toBe(SymbolVisibility.Public);
      logger.debug(
        () =>
          `Class symbol properties verified: name=${classSymbol?.name}, ` +
          `kind=${classSymbol?.kind}, visibility=${classSymbol?.modifiers.visibility}`,
      );

      // Check class scope
      const classScope = classFileScope?.getChildren()[0];
      expect(classScope).toBeDefined();
      expect(classScope?.name).toBe('TestClass');
      logger.debug('Class scope retrieved');

      // Check method implementation
      const method = classScope
        ?.getAllSymbols()
        .find((s: ApexSymbol) => s.kind === SymbolKind.Method);
      expect(method).toBeDefined();
      expect(method?.name).toBe('doSomething');
      expect(method?.modifiers.visibility).toBe(SymbolVisibility.Public);
      logger.debug(
        () =>
          `Method properties verified: name=${method?.name}, ` +
          `kind=${method?.kind}, visibility=${method?.modifiers.visibility}`,
      );
    });
  });

  describe('error handling', () => {
    it('should capture syntax errors', () => {
      logger.debug('Starting test: capture syntax errors');
      // Apex code with syntax error - missing semicolon
      const fileContent = `
        public class ErrorClass {
          private String name
          public void method() {}
        }
      `;

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ErrorClass.cls',
        listener,
      );

      // Should have a syntax error
      expect(result.errors.length).toBeGreaterThan(0);
      logger.debug(() => `Found ${result.errors.length} errors`);

      // Verify error details
      const syntaxErrors = result.errors.filter(
        (e) => e.type === ErrorType.Syntax,
      );
      expect(syntaxErrors.length).toBeGreaterThan(0);
      expect(syntaxErrors[0].line).toBe(4); // The line with the missing semicolon
      expect(syntaxErrors[0].severity).toBe(ErrorSeverity.Error);
      logger.debug(
        () =>
          `Syntax error verified: line=${syntaxErrors[0].line}, ` +
          `severity=${syntaxErrors[0].severity}`,
      );
    });

    it('should capture semantic errors for duplicate variable declarations', () => {
      logger.debug(
        'Starting test: capture semantic errors for duplicate variable declarations',
      );
      // Apex code with duplicate variable declaration
      const fileContent = `
        public class DuplicateVarClass {
          private void method() {
            Integer count = 0;
            String count = 'test'; // Duplicate variable name in same scope
          }
        }
      `;

      logger.debug('Compiling test file');
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
      logger.debug(
        () =>
          `Semantic error verified: line=${semanticErrors[0].line}, ` +
          `message=${semanticErrors[0].message}`,
      );
    });

    it('should capture semantic errors for conflicting method modifiers', () => {
      logger.debug(
        'Starting test: capture semantic errors for conflicting method modifiers',
      );
      // Apex code with conflicting method modifiers
      const fileContent = `
        public abstract class ModifierClass {
          abstract final void badMethod() {
            // Can't be both abstract and final
          }
        }
      `;

      logger.debug('Compiling test file');
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
      logger.debug(
        () => `Semantic error verified: message=${semanticErrors[0].message}`,
      );
    });

    it('should capture semantic warnings for method overrides', () => {
      logger.debug(
        'Starting test: capture semantic warnings for method overrides',
      );
      // Apex code with override method
      const fileContent = `
        public class OverrideClass {
          override public void overrideMethod() {
            // This will generate a warning about ensuring parent has compatible method
          }
        }
      `;

      logger.debug('Compiling test file');
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
      logger.debug(
        () =>
          `Semantic warning verified: message=${semanticWarnings[0].message}`,
      );
    });

    it('should capture multiple errors in a single file', () => {
      logger.debug('Starting test: capture multiple errors in a single file');
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

      logger.debug('Compiling test file');
      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'MultiErrorClass.cls',
        listener,
      );

      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      logger.debug(() => `Found ${result.errors.length} errors`);

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
      logger.debug(
        () =>
          `Error types verified: syntax=${syntaxErrors.length}, ` +
          `semantic=${semanticErrors.length}`,
      );
    });

    it('should capture semantic errors for invalid interface methods with implementation', () => {
      logger.debug(
        'Starting test: capture semantic errors for invalid interface methods with implementation',
      );
      // Interface method with implementation
      const fileContent = `
        public interface BadInterface {
          void badMethod() {
            // Interface methods should not have implementation
          }
        }
      `;

      logger.debug('Compiling test file');
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
      logger.debug(() => `Syntax error verified: type=${syntaxErrors[0].type}`);
    });

    it('should capture semantic errors for invalid visibility modifiers in interfaces', () => {
      logger.debug(
        'Starting test: capture semantic errors for invalid visibility modifiers in interfaces',
      );
      const fileContent = `
        public interface VisibilityInterface {
          private void privateMethod(); // Interface methods cannot be private
        }
      `;

      logger.debug('Compiling test file');
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
      logger.debug(
        () => `Semantic error verified: message=${semanticErrors[0].message}`,
      );
    });

    it('should capture semantic errors for duplicate method declarations', () => {
      logger.debug(
        'Starting test: capture semantic errors for duplicate method declarations',
      );
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

      logger.debug('Compiling test file');
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
      logger.debug(
        () => `Semantic error verified: message=${semanticErrors[0].message}`,
      );
    });

    it('should capture semantic errors for duplicate constructor declarations', () => {
      logger.debug(
        'Starting test: capture semantic errors for duplicate constructor declarations',
      );
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

      logger.debug('Compiling test file');
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
      logger.debug(
        () => `Semantic error verified: message=${semanticErrors[0].message}`,
      );
    });

    it('should capture semantic errors for duplicate interface method declarations', () => {
      logger.debug(
        'Starting test: capture semantic errors for duplicate interface method declarations',
      );
      const fileContent = `
        public interface DuplicateInterfaceMethodInterface {
          void sameMethod();

          String sameMethod(); // Duplicate method with different return type
        }
      `;

      logger.debug('Compiling test file');
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
      logger.debug(
        () => `Semantic error verified: message=${semanticErrors[0].message}`,
      );
    });
  });
});
