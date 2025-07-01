/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ClassDeclarationContext,
  FieldDeclarationContext,
  MethodDeclarationContext,
  VariableDeclaratorContext,
  InterfaceDeclarationContext,
  ConstructorDeclarationContext,
  InterfaceMethodDeclarationContext,
  FormalParameterContext,
  LocalVariableDeclarationContext,
  EnumDeclarationContext,
  BlockContext,
  ModifierContext,
  AnnotationContext,
  EnumConstantsContext,
  TriggerMemberDeclarationContext,
  TriggerUnitContext,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { BaseApexParserListener } from './BaseApexParserListener';
import { TypeInfo, createPrimitiveType } from '../../types/typeInfo';
import { Namespace, Namespaces } from '../../semantics/namespaces';
import {
  EnumSymbol,
  MethodSymbol,
  SymbolKind,
  SymbolLocation,
  SymbolModifiers,
  SymbolTable,
  SymbolVisibility,
  TypeSymbol,
  VariableSymbol,
  Annotation,
  AnnotationParameter,
  ApexSymbol,
} from '../../types/symbol';
import {
  ClassModifierValidator,
  FieldModifierValidator,
  InterfaceBodyValidator,
  ErrorReporter,
} from '../../semantics/modifiers/index';

interface SemanticError {
  type: 'semantic';
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  filePath: string;
}

/**
 * A listener that collects symbols from Apex code and organizes them into symbol tables.
 * This listener builds a hierarchy of symbol scopes and tracks symbols defined in each scope.
 */
export class ApexSymbolCollectorListener
  extends BaseApexParserListener<SymbolTable>
  implements ErrorReporter
{
  private readonly logger;
  private symbolTable: SymbolTable;
  private currentTypeSymbol: TypeSymbol | null = null;
  private currentMethodSymbol: MethodSymbol | null = null;
  private blockDepth: number = 0;
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();
  private currentAnnotations: Annotation[] = [];
  private currentFilePath: string = '';
  private semanticErrors: SemanticError[] = [];
  private semanticWarnings: SemanticError[] = [];

  /**
   * Creates a new instance of the ApexSymbolCollectorListener.
   * @param symbolTable Optional existing symbol table to use. If not provided, a new one will be created.
   */
  constructor(symbolTable?: SymbolTable) {
    super();
    this.logger = getLogger();
    this.symbolTable = symbolTable || new SymbolTable();
    // Initialize the file scope
    this.symbolTable.enterScope('file');
  }

  /**
   * Get the collected symbol table
   */
  getResult(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Creates a new instance of this listener for processing multiple files.
   * @returns A new instance of ApexSymbolCollectorListener with a fresh symbol table.
   */
  createNewInstance(): BaseApexParserListener<SymbolTable> {
    const newTable = new SymbolTable();
    newTable.enterScope('file');
    return new ApexSymbolCollectorListener(newTable);
  }

  /**
   * Create default modifiers
   */
  private createDefaultModifiers(): SymbolModifiers {
    return {
      visibility: SymbolVisibility.Default,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
    };
  }

  /**
   * Reset modifiers to defaults
   */
  private resetModifiers(): void {
    this.currentModifiers = this.createDefaultModifiers();
  }

  /**
   * Get the current modifiers
   */
  private getCurrentModifiers(): SymbolModifiers {
    return { ...this.currentModifiers };
  }

  /**
   * Reset the current annotations list
   */
  private resetAnnotations(): void {
    this.currentAnnotations = [];
  }

  /**
   * Get the current annotations
   */
  private getCurrentAnnotations(): Annotation[] {
    return [...this.currentAnnotations];
  }

  /**
   * Called when entering an annotation in the Apex code.
   * Processes the annotation and its parameters, creating an annotation object.
   * @param ctx The parser context for the annotation.
   */
  enterAnnotation(ctx: AnnotationContext): void {
    try {
      const name = ctx.text.replace('@', '');
      const parameters: AnnotationParameter[] = [];

      // Process annotation parameters
      const paramStart = ctx.text.indexOf('(');
      if (paramStart > 0) {
        const paramEnd = ctx.text.lastIndexOf(')');
        if (paramEnd > paramStart) {
          const paramsStr = ctx.text.substring(paramStart + 1, paramEnd);
          const paramPairs = paramsStr.split(',');
          for (const pair of paramPairs) {
            const equalsPos = pair.indexOf('=');
            if (equalsPos > 0) {
              const paramName = pair.substring(0, equalsPos).trim();
              const paramValue = pair.substring(equalsPos + 1).trim();
              parameters.push({
                name: paramName,
                value: paramValue,
              });
            }
          }
        }
      }

      // Create annotation object
      const annotation: Annotation = {
        name,
        location: this.getLocation(ctx),
        parameters,
      };

      // Add to current annotations
      this.currentAnnotations.push(annotation);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in annotation: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a modifier
   * The parser will call this for each modifier it encounters
   */
  enterModifier(ctx: ModifierContext): void {
    try {
      const modifier = ctx.text.toLowerCase();

      // Check for modifiers in interface methods
      if (
        this.currentTypeSymbol?.kind === SymbolKind.Interface &&
        this.currentMethodSymbol &&
        modifier
      ) {
        this.addError('Modifiers are not allowed on interface methods', ctx);
      }

      // Apply the modifier to the current modifiers
      this.applyModifier(this.currentModifiers, modifier);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error processing modifier: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a class declaration in the Apex code.
   * Processes the class declaration, its modifiers, and annotations.
   * @param ctx The parser context for the class declaration.
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownClass';
      this.logger.debug(() => `Entering class declaration: ${name}`);

      // Validate class in interface
      InterfaceBodyValidator.validateClassInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      // Get current modifiers and annotations
      const modifiers = this.getCurrentModifiers();
      const annotations = this.getCurrentAnnotations();

      // Validate class modifiers using ClassModifierValidator
      ClassModifierValidator.validateClassVisibilityModifiers(
        name,
        modifiers,
        ctx,
        !!this.currentTypeSymbol, // isInnerClass
        this.currentTypeSymbol,
        annotations,
        this,
      );

      // Get superclass and interfaces
      const superclass = ctx.typeRef()?.text;
      const interfaces =
        ctx
          .typeList()
          ?.typeRef()
          .map((t) => t.text) || [];

      // Validate inner class rules if this is an inner class
      if (this.currentTypeSymbol) {
        // Check for same name as outer class
        if (name === this.currentTypeSymbol.name) {
          this.addError(
            `Inner class '${name}' cannot have the same name as its outer class '${this.currentTypeSymbol.name}'.`,
            ctx,
          );
        }

        // Check for nested inner class
        if (
          this.currentTypeSymbol.kind === SymbolKind.Class &&
          this.currentTypeSymbol.parent?.kind === SymbolKind.Class
        ) {
          this.addError(
            `Inner class '${name}' cannot be defined within another inner class. ` +
              'Apex does not support nested inner classes.',
            ctx,
          );
        }
      }

      // Create a new class symbol
      const classSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Class,
        modifiers,
      );

      // Set superclass and interfaces
      if (superclass) {
        classSymbol.superClass = superclass;
      }
      classSymbol.interfaces = interfaces;

      // Add annotations to the class symbol
      if (annotations.length > 0) {
        classSymbol.annotations = annotations;
      }

      // Store the current class symbol
      this.currentTypeSymbol = classSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(classSymbol);

      // Enter class scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered class scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in class declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a class declaration
   */
  exitClassDeclaration(): void {
    // Exit the class scope
    const currentScope = this.symbolTable.getCurrentScope();
    this.logger.debug(() => `Exiting class scope: ${currentScope.name}`);
    this.symbolTable.exitScope();

    // Clear current type symbol
    this.currentTypeSymbol = null;
  }

  /**
   * Called when entering an interface declaration
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownInterface';
      this.logger.debug(() => `Entering interface declaration: ${name}`);

      // Validate interface in interface
      InterfaceBodyValidator.validateInterfaceInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      // Get current modifiers and annotations
      const modifiers = this.getCurrentModifiers();
      const annotations = this.getCurrentAnnotations();

      // Validate interface modifiers using ClassModifierValidator
      ClassModifierValidator.validateInterfaceVisibilityModifiers(
        name,
        modifiers,
        ctx,
        !!this.currentTypeSymbol, // isInnerInterface
        this.currentTypeSymbol,
        this,
      );

      // Get interfaces
      const interfaces =
        ctx
          .typeList()
          ?.typeRef()
          .map((t) => t.text) || [];

      // Create a new interface symbol
      const interfaceSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Interface,
        modifiers,
      );

      // Set interfaces
      interfaceSymbol.interfaces = interfaces;

      // Add annotations to the interface symbol
      if (annotations.length > 0) {
        interfaceSymbol.annotations = annotations;
      }

      // Store the current interface symbol
      this.currentTypeSymbol = interfaceSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(interfaceSymbol);

      // Enter interface scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered interface scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in interface declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting an interface declaration
   */
  exitInterfaceDeclaration(): void {
    // Exit the interface scope
    this.symbolTable.exitScope();
    this.currentTypeSymbol = null;
  }

  /**
   * Called when entering a method declaration in the Apex code.
   * Processes the method declaration, its modifiers, return type, and annotations.
   * @param ctx The parser context for the method declaration.
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownMethod';
      this.logger.debug(
        () =>
          `Entering method declaration: ${name} in class: ${this.currentTypeSymbol?.name}`,
      );

      // Get current modifiers and annotations
      const modifiers = this.getCurrentModifiers();
      const annotations = this.getCurrentAnnotations();

      // Check for conflicting modifiers
      if (modifiers.isAbstract && modifiers.isFinal) {
        this.addError('Method cannot be both abstract and final', ctx);
      }

      if (modifiers.isAbstract && modifiers.isStatic) {
        this.addError('Method cannot be both abstract and static', ctx);
      }

      // Get the return type
      const returnType = this.getReturnType(ctx);

      // Check for method override
      if (modifiers.isOverride) {
        const parentClass = this.currentTypeSymbol?.parent;
        if (!parentClass) {
          this.addWarning(
            `Override method ${name} must ensure a parent class has a compatible method`,
            ctx,
          );
        }
      }

      // Check for duplicate method in the same scope
      if (this.currentTypeSymbol) {
        const currentScope = this.symbolTable.getCurrentScope();
        const existingSymbols = currentScope.getAllSymbols();

        // Get the parameter types for the current method
        const currentParamTypes =
          ctx
            .formalParameters()
            ?.formalParameterList()
            ?.formalParameter()
            ?.map((param) => this.getTextFromContext(param.typeRef()))
            .join(',') || '';

        const duplicateMethod = existingSymbols.find((s) => {
          if (s.kind !== SymbolKind.Method || s.name !== name) {
            return false;
          }
          const methodSymbol = s as MethodSymbol;
          const existingParamTypes =
            methodSymbol.parameters
              ?.map((param) => param.type.originalTypeString)
              .join(',') || '';
          return existingParamTypes === currentParamTypes;
        });

        if (duplicateMethod) {
          this.addError(`Duplicate method declaration: ${name}`, ctx);
          return;
        }
      }

      // Create a new method symbol
      const methodSymbol = this.createMethodSymbol(
        ctx,
        name,
        modifiers,
        returnType,
      );

      // Add annotations to the method symbol
      if (annotations.length > 0) {
        methodSymbol.annotations = annotations;
      }

      // Store the current method symbol
      this.currentMethodSymbol = methodSymbol;

      // Add method symbol to current scope
      this.symbolTable.addSymbol(methodSymbol);

      // Enter method scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered method scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in method declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a method declaration in the Apex code.
   * Cleans up the method scope and resets the current method symbol.
   */
  exitMethodDeclaration(): void {
    // Exit method scope
    const currentScope = this.symbolTable.getCurrentScope();
    this.logger.debug(() => `Exiting method scope: ${currentScope.name}`);
    this.symbolTable.exitScope();

    // Clear current method symbol
    this.currentMethodSymbol = null;
  }

  /**
   * Called when entering a constructor declaration in the Apex code.
   * Processes the constructor declaration, its modifiers, and validates visibility.
   * @param ctx The parser context for the constructor declaration.
   */
  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    try {
      const name = this.currentTypeSymbol?.name ?? 'unknownConstructor';

      // Validate constructor in interface
      InterfaceBodyValidator.validateConstructorInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      // Check for duplicate constructor
      if (this.currentTypeSymbol) {
        const currentScope = this.symbolTable.getCurrentScope();
        const existingSymbols = currentScope.getAllSymbols();

        // Get the parameter types for the current constructor
        const currentParamTypes =
          ctx
            .formalParameters()
            ?.formalParameterList()
            ?.formalParameter()
            ?.map((param) => this.getTextFromContext(param.typeRef()))
            .join(',') || '';

        const duplicateConstructor = existingSymbols.find((s) => {
          if (
            s.kind !== SymbolKind.Method ||
            s.name !== name ||
            !(s as MethodSymbol).isConstructor
          ) {
            return false;
          }
          const methodSymbol = s as MethodSymbol;
          const existingParamTypes =
            methodSymbol.parameters
              ?.map((param) => param.type.originalTypeString)
              .join(',') || '';
          return existingParamTypes === currentParamTypes;
        });

        if (duplicateConstructor) {
          this.addError(`Duplicate constructor declaration: ${name}`, ctx);
          return;
        }
      }

      const modifiers = this.getCurrentModifiers();
      const location = this.getLocation(ctx);
      const parent = this.currentTypeSymbol;
      const parentKey = parent ? parent.key : null;
      const key = {
        prefix: SymbolKind.Method,
        name,
        path: this.getCurrentPath(),
      };

      const constructorSymbol: MethodSymbol = {
        name,
        kind: SymbolKind.Method,
        location,
        modifiers,
        returnType: createPrimitiveType('void'),
        parameters: [],
        parent,
        key,
        parentKey,
        isConstructor: true,
      };

      this.currentMethodSymbol = constructorSymbol;
      this.symbolTable.addSymbol(constructorSymbol);
      this.symbolTable.enterScope(name);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in constructor: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a constructor declaration in the Apex code.
   * Cleans up the constructor scope and resets the current method symbol.
   */
  exitConstructorDeclaration(): void {
    // Exit constructor scope
    this.symbolTable.exitScope();
    this.currentMethodSymbol = null;
  }

  /**
   * Called when entering an interface method declaration in the Apex code.
   * Processes the interface method declaration, its modifiers, and annotations.
   * @param ctx The parser context for the interface method declaration.
   */
  enterInterfaceMethodDeclaration(
    ctx: InterfaceMethodDeclarationContext,
  ): void {
    try {
      // Get the method name
      const name = ctx.id()?.text ?? 'unknownMethod';

      // Get current annotations
      const annotations = this.getCurrentAnnotations();

      // Check for duplicate method in the same scope
      if (this.currentTypeSymbol) {
        const currentScope = this.symbolTable.getCurrentScope();
        const existingSymbols = currentScope.getAllSymbols();
        const duplicateMethod = existingSymbols.find(
          (s) => s.kind === SymbolKind.Method && s.name === name,
        );

        if (duplicateMethod) {
          this.addError(`Duplicate interface method declaration: ${name}`, ctx);
          return;
        }
      }

      // Interface methods are implicitly public and abstract
      const implicitModifiers: SymbolModifiers = {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: true,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      };

      // Get the return type
      const returnType = this.getReturnType(ctx);

      // Create a new method symbol
      const methodSymbol = this.createMethodSymbol(
        ctx,
        name,
        implicitModifiers,
        returnType,
      );

      // Add annotations to the method symbol
      if (annotations.length > 0) {
        methodSymbol.annotations = annotations;
      }

      // Store the current method symbol
      this.currentMethodSymbol = methodSymbol;

      // Add method symbol to current scope
      this.symbolTable.addSymbol(methodSymbol);

      // Enter method scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered interface method scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error in interface method declaration: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Called when exiting an interface method declaration in the Apex code.
   * Cleans up the method scope and resets the current method symbol.
   */
  exitInterfaceMethodDeclaration(): void {
    // Exit method scope
    this.symbolTable.exitScope();
    this.currentMethodSymbol = null;
  }

  /**
   * Called when entering a formal parameter (method parameter)
   */
  enterFormalParameter(ctx: FormalParameterContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownParameter';
      const type = this.createTypeInfo(ctx.typeRef()?.text ?? 'Object');
      const modifiers = this.getCurrentModifiers();
      const location = this.getLocation(ctx);
      const parent = this.currentMethodSymbol;
      const parentKey = parent ? parent.key : null;
      const key = {
        prefix: SymbolKind.Parameter,
        name,
        path: this.getCurrentPath(),
      };

      const paramSymbol: VariableSymbol = {
        name,
        kind: SymbolKind.Parameter,
        location,
        modifiers,
        type,
        parent,
        key,
        parentKey,
      };

      if (this.currentMethodSymbol) {
        this.currentMethodSymbol.parameters.push(paramSymbol);
      }
      this.symbolTable.addSymbol(paramSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in parameter: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a field declaration
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    try {
      const type = this.createTypeInfo(this.getTextFromContext(ctx.typeRef()!));
      this.logger.debug(
        () =>
          `Entering field declaration in class: ${this.currentTypeSymbol?.name}, type: ${type.name}`,
      );

      // Get current modifiers
      const modifiers = this.getCurrentModifiers();

      // Validate field declaration in interface
      if (this.currentTypeSymbol) {
        InterfaceBodyValidator.validateFieldInInterface(
          modifiers,
          ctx,
          this.currentTypeSymbol,
          this,
        );

        // Additional field modifier validations
        FieldModifierValidator.validateFieldVisibilityModifiers(
          modifiers,
          ctx,
          this.currentTypeSymbol,
          this,
        );
      }

      // Process each variable declarator in the field declaration
      for (const declarator of ctx
        .variableDeclarators()
        ?.variableDeclarator() || []) {
        this.processVariableDeclarator(
          declarator,
          type,
          modifiers,
          SymbolKind.Property,
        );
      }

      // Reset modifiers and annotations for the next symbol
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in field declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a local variable declaration
   */
  enterLocalVariableDeclaration(ctx: LocalVariableDeclarationContext): void {
    try {
      // Get current modifiers and reset for next declaration
      const modifiers = this.getCurrentModifiers();
      this.resetModifiers();

      // Get the type
      const varTypeText = ctx.typeRef()
        ? this.getTextFromContext(ctx.typeRef())
        : 'Object';
      const varType = this.createTypeInfo(varTypeText);

      // Process each variable declared
      const variableDeclarators = ctx
        .variableDeclarators()
        .variableDeclarator();
      for (const declarator of variableDeclarators) {
        const name = declarator.id()?.text ?? 'unknownVariable';

        // Check for duplicate variable in current scope
        const currentScope = this.symbolTable.getCurrentScope();
        const existingSymbol = currentScope.getSymbol(name);
        if (existingSymbol) {
          this.addError(`Duplicate variable declaration: ${name}`, declarator);
          continue;
        }

        // Always process the variable in the current scope
        this.processVariableDeclarator(
          declarator,
          varType,
          modifiers,
          SymbolKind.Variable,
        );
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error in local variable declaration: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Called when entering an enum declaration
   */
  enterEnumDeclaration(ctx: EnumDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownEnum';

      // Validate enum in interface
      InterfaceBodyValidator.validateEnumInInterface(
        name,
        ctx,
        this.currentTypeSymbol,
        this,
      );

      const modifiers = this.getCurrentModifiers();
      const location = this.getLocation(ctx);
      const parent = this.currentTypeSymbol;
      const parentKey = parent ? parent.key : null;
      const key = {
        prefix: SymbolKind.Enum,
        name,
        path: this.getCurrentPath(),
      };

      const enumSymbol: EnumSymbol = {
        name,
        kind: SymbolKind.Enum,
        location,
        modifiers,
        values: [],
        interfaces: [], // Required by TypeSymbol
        superClass: undefined, // Optional in TypeSymbol
        parent,
        key,
        parentKey,
        annotations: this.getCurrentAnnotations(),
      };

      this.currentTypeSymbol = enumSymbol;
      this.symbolTable.addSymbol(enumSymbol);
      this.symbolTable.enterScope(name);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering enum constants
   */
  enterEnumConstants(ctx: EnumConstantsContext): void {
    try {
      const enumType = this.createTypeInfo(
        this.currentTypeSymbol?.name ?? 'Object',
      );
      const enumSymbol = this.currentTypeSymbol as EnumSymbol | null;

      if (!enumSymbol || enumSymbol.kind !== SymbolKind.Enum) {
        this.addError('Enum constants found outside of enum declaration', ctx);
        return;
      }

      for (const id of ctx.id()) {
        const name = id.text;
        const modifiers = this.getCurrentModifiers();
        const location = this.getLocation(id);
        const parent = enumSymbol;
        const parentKey = parent.key;
        const key = {
          prefix: SymbolKind.EnumValue,
          name,
          path: this.getCurrentPath(),
        };

        const valueSymbol: VariableSymbol = {
          name,
          kind: SymbolKind.EnumValue,
          location,
          modifiers,
          type: enumType,
          parent,
          key,
          parentKey,
        };

        enumSymbol.values.push(valueSymbol);
        this.symbolTable.addSymbol(valueSymbol);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum constants: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting an enum declaration
   */
  exitEnumDeclaration(): void {
    // Exit enum scope
    this.symbolTable.exitScope();
  }

  /**
   * Called when entering a block
   */
  enterBlock(ctx: BlockContext): void {
    try {
      this.blockDepth++;
      const name = `block${this.blockDepth}`;
      const modifiers = this.getCurrentModifiers();
      const location = this.getLocation(ctx);
      const parent = this.currentTypeSymbol || this.currentMethodSymbol;
      const parentKey = parent ? parent.key : null;
      const key = {
        prefix: SymbolKind.Method,
        name,
        path: this.getCurrentPath(),
      };

      const blockSymbol: ApexSymbol = {
        name,
        kind: SymbolKind.Method,
        location,
        modifiers,
        parent,
        key,
        parentKey,
      };

      this.symbolTable.enterScope(name, 'block');
      this.symbolTable.addSymbol(blockSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in block: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a block
   */
  exitBlock(): void {
    // Exit block scope
    const currentScope = this.symbolTable.getCurrentScope();
    this.logger.debug(() => `Exiting block scope: ${currentScope.name}`);
    this.symbolTable.exitScope();
    this.blockDepth--;
  }

  /**
   * Process a variable declarator
   */
  private processVariableDeclarator(
    ctx: VariableDeclaratorContext,
    type: TypeInfo,
    modifiers: SymbolModifiers,
    kind: SymbolKind.Property | SymbolKind.Variable | SymbolKind.EnumValue,
  ): void {
    try {
      const name = ctx.id()?.text ?? 'unknownVariable';
      const location = this.getLocation(ctx);
      const parent = this.currentTypeSymbol || this.currentMethodSymbol;
      const parentKey = parent ? parent.key : null;
      const key = {
        prefix: kind,
        name,
        path: this.getCurrentPath(),
      };

      const variableSymbol: VariableSymbol = {
        name,
        kind,
        location,
        modifiers,
        type,
        parent,
        key,
        parentKey,
      };

      this.symbolTable.addSymbol(variableSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in variable: ${errorMessage}`, ctx);
    }
  }

  /**
   * Get location information from a context
   */
  private getLocation(ctx: ParserRuleContext): SymbolLocation {
    return {
      startLine: ctx.start.line,
      startColumn: ctx.start.charPositionInLine,
      endLine: ctx.stop?.line ?? ctx.start.line,
      endColumn:
        (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
        (ctx.stop?.text?.length ?? 0),
    };
  }

  /**
   * Apply a modifier to the modifiers object
   */
  private applyModifier(modifiers: SymbolModifiers, modifier: string): void {
    switch (modifier.toLowerCase()) {
      case 'public':
        modifiers.visibility = SymbolVisibility.Public;
        break;
      case 'private':
        modifiers.visibility = SymbolVisibility.Private;
        break;
      case 'protected':
        modifiers.visibility = SymbolVisibility.Protected;
        break;
      case 'global':
        modifiers.visibility = SymbolVisibility.Global;
        break;
      case 'static':
        modifiers.isStatic = true;
        break;
      case 'final':
        modifiers.isFinal = true;
        break;
      case 'abstract':
        modifiers.isAbstract = true;
        break;
      case 'virtual':
        modifiers.isVirtual = true;
        break;
      case 'override':
        modifiers.isOverride = true;
        break;
      case 'transient':
        modifiers.isTransient = true;
        break;
      case 'testmethod':
        modifiers.isTestMethod = true;
        break;
      case 'webservice':
        modifiers.isWebService = true;
        break;
    }
  }

  /**
   * Extract text from a parser context
   */
  private getTextFromContext(ctx: any): string {
    if (!ctx) return '';
    return ctx.text || '';
  }

  /**
   * Get the return type from a method declaration context
   * Handles both typeRef and VOID cases
   */
  private getReturnType(
    ctx: MethodDeclarationContext | InterfaceMethodDeclarationContext,
  ): TypeInfo {
    if (ctx.typeRef()) {
      return this.createTypeInfo(this.getTextFromContext(ctx.typeRef()!));
    }
    // Handle VOID case
    return createPrimitiveType('void');
  }

  /**
   * Create a TypeInfo object from a type string
   */
  private createTypeInfo(typeString: string): TypeInfo {
    this.logger.debug(
      () => `createTypeInfo called with typeString: ${typeString}`,
    );

    // Handle qualified type names (e.g., System.PageReference)
    if (typeString.includes('.')) {
      const [namespace, typeName] = typeString.split('.');
      this.logger.debug(
        () =>
          `Processing qualified type - namespace: ${namespace}, typeName: ${typeName}`,
      );

      // Use predefined namespaces for built-in types
      if (namespace === 'System') {
        this.logger.debug(
          () => 'Using Namespaces.SYSTEM for System namespace type',
        );
        return {
          name: typeName,
          isArray: false,
          isCollection: false,
          isPrimitive: false,
          namespace: Namespaces.SYSTEM,
          originalTypeString: typeString,
          getNamespace: () => Namespaces.SYSTEM,
        };
      }
      // For other namespaces, create a new namespace instance
      this.logger.debug(
        () => 'Creating new namespace instance for non-System namespace',
      );
      return {
        name: typeName,
        isArray: false,
        isCollection: false,
        isPrimitive: false,
        namespace: new Namespace(namespace, ''),
        originalTypeString: typeString,
        getNamespace: () => new Namespace(namespace, ''),
      };
    }

    // For simple types, use createPrimitiveType
    this.logger.debug(() => 'Using createPrimitiveType for simple type');
    return createPrimitiveType(typeString);
  }

  /**
   * Check if a symbol has a parent that is a class (meaning it's an inner class)
   * @param symbol The symbol to check, defaults to the current type symbol if not provided
   * @returns true if the symbol is an inner class, false otherwise
   */
  private hasClassParent(symbol?: TypeSymbol | null): boolean {
    if (!symbol) {
      return false;
    }
    const parent = symbol.parent;
    return (
      parent !== null &&
      parent !== undefined &&
      parent.kind === SymbolKind.Class
    );
  }

  /**
   * Check if a symbol is nested within another inner class
   * @param symbol The symbol to check, defaults to the current type symbol if not provided
   * @returns true if the symbol is nested within another inner class, false otherwise
   */
  private isNestedInInnerClass(symbol?: TypeSymbol | null): boolean {
    // Use the provided symbol or fall back to current type symbol
    const symbolToCheck = symbol || this.currentTypeSymbol;

    // If no symbol to check, return false
    if (!symbolToCheck) {
      return false;
    }

    // Start with the parent
    let current = symbolToCheck.parent;
    let classCount = 0;

    // Traverse up the parent chain
    while (current) {
      if (current.kind === SymbolKind.Class) {
        classCount++;
        // If we find more than one class in the parent chain,
        // this means we have a nested inner class
        if (classCount > 1) {
          return true;
        }
      }
      current = current.parent;
    }

    return false;
  }

  /**
   * Add an error to the error list
   */
  addError(message: string, ctx: ParserRuleContext): void {
    const error: SemanticError = {
      type: 'semantic',
      severity: 'error',
      message,
      line: ctx.start.line,
      column: ctx.start.charPositionInLine,
      filePath: this.currentFilePath,
    };
    this.semanticErrors.push(error);
    super.addError(message, ctx);
  }

  /**
   * Add a warning to the warning list
   */
  addWarning(message: string, ctx: ParserRuleContext): void {
    const warning: SemanticError = {
      type: 'semantic',
      severity: 'warning',
      message,
      line: ctx.start.line,
      column: ctx.start.charPositionInLine,
      filePath: this.currentFilePath,
    };
    this.semanticWarnings.push(warning);
    super.addWarning(message, ctx);
  }

  /**
   * Get all semantic errors
   */
  getErrors(): SemanticError[] {
    return this.semanticErrors;
  }

  /**
   * Get all semantic warnings
   */
  getWarnings(): string[] {
    return this.semanticWarnings.map((warning) => warning.message);
  }

  /**
   * Get all semantic warnings with full details
   */
  getSemanticWarnings(): SemanticError[] {
    return this.semanticWarnings;
  }

  private createTypeSymbol(
    ctx: ParserRuleContext,
    name: string,
    kind: SymbolKind.Class | SymbolKind.Interface | SymbolKind.Trigger,
    modifiers: SymbolModifiers,
  ): TypeSymbol {
    const location = this.getLocation(ctx);
    const parent = this.currentTypeSymbol;
    const parentKey = parent ? parent.key : null;
    const key = {
      prefix: kind,
      name,
      path: this.getCurrentPath(),
    };

    const typeSymbol: TypeSymbol = {
      name,
      kind,
      location,
      modifiers,
      interfaces: [],
      parent,
      key,
      parentKey,
      annotations: this.getCurrentAnnotations(),
    };

    return typeSymbol;
  }

  private createMethodSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
    returnType: TypeInfo,
  ): MethodSymbol {
    const location = this.getLocation(ctx);
    const parent = this.currentTypeSymbol;
    const parentKey = parent ? parent.key : null;
    const key = {
      prefix: SymbolKind.Method,
      name,
      path: this.getCurrentPath(),
    };

    const methodSymbol: MethodSymbol = {
      name,
      kind: SymbolKind.Method,
      location,
      modifiers,
      returnType,
      parameters: [],
      parent,
      key,
      parentKey,
      isConstructor: false,
      annotations: this.getCurrentAnnotations(),
    };

    return methodSymbol;
  }

  private createPropertySymbol(
    ctx: ParserRuleContext,
    name: string,
    kind: SymbolKind.Property | SymbolKind.Variable | SymbolKind.EnumValue,
    type: TypeInfo,
  ): VariableSymbol {
    const location = this.getLocation(ctx);
    const parent = this.currentTypeSymbol || this.currentMethodSymbol;
    const parentKey = parent ? parent.key : null;
    const key = {
      prefix: kind,
      name,
      path: this.getCurrentPath(),
    };

    const propertySymbol: VariableSymbol = {
      name,
      kind,
      location,
      modifiers: this.getCurrentModifiers(),
      type,
      parent,
      key,
      parentKey,
    };

    return propertySymbol;
  }

  private getCurrentPath(): string[] {
    const path: string[] = [];
    let current = this.currentTypeSymbol;
    while (current) {
      path.unshift(current.name);
      current = current.parent as TypeSymbol | null;
    }
    return path;
  }

  /**
   * Called when entering a trigger declaration
   */
  enterTriggerMemberDeclaration(ctx: TriggerMemberDeclarationContext): void {
    try {
      // Get the trigger name from the parent context
      const triggerUnit = ctx.parent?.parent as TriggerUnitContext;
      const name = triggerUnit?.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Create trigger symbol
      const triggerSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Trigger,
        modifiers,
      );

      // Store the current type symbol
      this.currentTypeSymbol = triggerSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(triggerSymbol);

      // Enter trigger scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered trigger scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in trigger declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a trigger declaration
   */
  exitTriggerMemberDeclaration(): void {
    // Exit trigger scope
    this.symbolTable.exitScope();
    this.currentTypeSymbol = null;
  }

  /**
   * Called when entering a trigger unit
   */
  enterTriggerUnit(ctx: TriggerUnitContext): void {
    try {
      // Get the trigger name from the first id
      const name = ctx.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Create trigger symbol
      const triggerSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Trigger,
        modifiers,
      );

      // Store the current type symbol
      this.currentTypeSymbol = triggerSymbol;

      // Add symbol to current scope
      this.symbolTable.addSymbol(triggerSymbol);

      // Enter trigger scope
      this.symbolTable.enterScope(name);
      this.logger.debug(() => `Entered trigger scope: ${name}`);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in trigger declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a trigger unit
   */
  exitTriggerUnit(): void {
    // Exit trigger scope
    this.symbolTable.exitScope();
    this.currentTypeSymbol = null;
  }
}
