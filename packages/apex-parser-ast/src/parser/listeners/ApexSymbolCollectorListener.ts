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
  MethodModifierValidator,
  ClassModifierValidator,
  ErrorReporter,
} from '../../sematics/modifiers/index';
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
  private symbolTable: SymbolTable;
  private currentTypeSymbol: TypeSymbol | null = null;
  private currentMethodSymbol: MethodSymbol | null = null;
  private blockDepth: number = 0;
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();
  private currentAnnotations: Annotation[] = [];
  private currentFilePath: string = '';
  private semanticErrors: SemanticError[] = [];
  private semanticWarnings: SemanticError[] = [];
  private readonly logger = getLogger();

  /**
   * Creates a new instance of the ApexSymbolCollectorListener.
   * @param symbolTable Optional existing symbol table to use. If not provided, a new one will be created.
   */
  constructor(symbolTable?: SymbolTable) {
    super();
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
      this.logger.info(`Entering class declaration: ${name}`);

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

      // Enter class scope
      this.symbolTable.enterScope(name);
      this.logger.info(`Entered class scope: ${name}`);

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
    this.logger.info(`Exiting class scope: ${currentScope.name}`);
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
      this.logger.info(`Entering interface declaration: ${name}`);

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

      // Enter interface scope
      this.symbolTable.enterScope(name);
      this.logger.info(`Entered interface scope: ${name}`);

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
      this.logger.info(
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
      const returnType = this.createTypeInfo(
        this.getTextFromContext(ctx.typeRef()!),
      );

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
        const duplicateMethod = existingSymbols.find(
          (s) => s.kind === SymbolKind.Method && s.name === name,
        );

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
      this.logger.info(`Entered method scope: ${name}`);

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
    this.logger.info(`Exiting method scope: ${currentScope.name}`);
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
    if (!this.currentTypeSymbol) return;

    // Modifiers are collected by enterModifier before this is called
    const constructorName = this.currentTypeSymbol.name;

    // Get location
    const location = this.getLocation(ctx);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();

    // Validate constructor visibility modifiers
    MethodModifierValidator.validateConstructorVisibilityModifiers(
      constructorName,
      modifiers,
      ctx,
      this.currentTypeSymbol,
      this,
    );

    this.resetModifiers();

    // Check for duplicate constructor declarations
    const existingSymbol =
      this.symbolTable.findSymbolInCurrentScope(constructorName);
    if (
      existingSymbol &&
      existingSymbol.kind === SymbolKind.Method &&
      (existingSymbol as MethodSymbol).isConstructor
    ) {
      // Report a semantic error for duplicate constructor declaration
      this.addError(
        `Duplicate constructor declaration in class '${constructorName}'`,
        ctx,
      );
    }

    // Create constructor symbol (as a method with the same name as the class)
    const constructorSymbol: MethodSymbol = {
      name: constructorName,
      kind: SymbolKind.Method,
      location,
      modifiers,
      returnType: createPrimitiveType(this.currentTypeSymbol.name),
      parameters: [],
      parent: this.currentTypeSymbol,
      isConstructor: true,
    };

    // Add to symbol table and enter constructor scope
    this.symbolTable.addSymbol(constructorSymbol);
    this.symbolTable.enterScope(constructorName);

    // Store current method as the constructor
    this.currentMethodSymbol = constructorSymbol;

    // Parameters will be processed in enterFormalParameter
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
      const returnType = this.createTypeInfo(
        this.getTextFromContext(ctx.typeRef()!),
      );

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

      // Enter method scope
      this.symbolTable.enterScope(name);
      this.logger.info(`Entered interface method scope: ${name}`);

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
    if (!this.currentMethodSymbol) return;

    const paramName = ctx.id()?.text ?? 'unknownParam';
    const paramTypeText = ctx.typeRef()
      ? this.getTextFromContext(ctx.typeRef())
      : 'Object';
    const paramType = this.createTypeInfo(paramTypeText);

    // Get location
    const location = this.getLocation(ctx);

    // Parameters have default modifiers
    this.resetModifiers();
    const modifiers = this.getCurrentModifiers();

    // Create parameter symbol
    const paramSymbol: VariableSymbol = {
      name: paramName,
      kind: SymbolKind.Parameter,
      location,
      modifiers,
      type: paramType,
      parent: this.currentMethodSymbol,
    };

    // Add to current method's parameters and symbol table
    this.currentMethodSymbol.parameters.push(paramSymbol);
    this.symbolTable.addSymbol(paramSymbol);
  }

  /**
   * Called when entering a field declaration
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    try {
      const type = this.createTypeInfo(this.getTextFromContext(ctx.typeRef()!));
      this.logger.info(
        `Entering field declaration in class: ${this.currentTypeSymbol?.name}, type: ${type.name}`,
      );

      // Process each variable declarator in the field declaration
      for (const declarator of ctx
        .variableDeclarators()
        ?.variableDeclarator() || []) {
        this.processVariableDeclarator(
          declarator,
          type,
          this.getCurrentModifiers(),
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
    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Get the type
    const varTypeText = ctx.typeRef()
      ? this.getTextFromContext(ctx.typeRef())
      : 'Object';
    const varType = this.createTypeInfo(varTypeText);

    // Process each variable declared
    const variableDeclarators = ctx.variableDeclarators().variableDeclarator();
    for (const declarator of variableDeclarators) {
      // Always process the variable in the current scope
      this.processVariableDeclarator(
        declarator,
        varType,
        modifiers,
        SymbolKind.Variable,
      );
    }
  }

  /**
   * Called when entering an enum declaration
   */
  enterEnumDeclaration(ctx: EnumDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownEnum';
      this.logger.info(`Entering enum declaration: ${name}`);

      // Get current modifiers and annotations
      const modifiers = this.getCurrentModifiers();
      const annotations = this.getCurrentAnnotations();

      // Create enum symbol
      const enumSymbol: EnumSymbol = {
        name,
        kind: SymbolKind.Enum,
        location: this.getLocation(ctx),
        modifiers,
        values: [],
        parent: this.currentTypeSymbol,
      };

      // Add annotations to the enum symbol
      if (annotations.length > 0) {
        enumSymbol.annotations = annotations;
      }

      // Add to current scope
      const currentScope = this.symbolTable.getCurrentScope();
      currentScope.addSymbol(enumSymbol);
      this.logger.info(
        `Added enum symbol: ${name} to scope: ${currentScope.name}`,
      );

      // Enter enum scope
      this.symbolTable.enterScope(name);

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering enum constants
   */
  enterEnumConstants(ctx: EnumConstantsContext): void {
    try {
      // Get the enum symbol from the current scope
      const parentScope = this.symbolTable.getParentScope();
      const currentScope = this.symbolTable.getCurrentScope();
      if (!parentScope) {
        this.addError('Enum constants found outside of enum declaration', ctx);
        return;
      }
      const enumSymbol = parentScope
        .getAllSymbols()
        .find(
          (s) => s.kind === SymbolKind.Enum && s.name === currentScope.name,
        ) as EnumSymbol;

      if (!enumSymbol || enumSymbol.kind !== SymbolKind.Enum) {
        this.addError('Enum constants found outside of enum declaration', ctx);
        return;
      }

      // Get all enum constant IDs
      const ids = ctx.id();
      for (const id of ids) {
        const valueName = id.text;

        const valueSymbol: VariableSymbol = {
          name: valueName,
          kind: SymbolKind.EnumValue,
          location: this.getLocation(id),
          modifiers: this.createDefaultModifiers(),
          type: createPrimitiveType(enumSymbol.name),
          parent: enumSymbol,
        };

        // Add to symbol table and enum values
        this.symbolTable.addSymbol(valueSymbol);
        enumSymbol.values.push(valueSymbol);
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
    this.blockDepth++;

    // Create a new scope for all blocks
    const scopeName = `block_${ctx.start.line}_${ctx.start.charPositionInLine}`;
    this.symbolTable.enterScope(scopeName);
    this.logger.info(`Entered block scope: ${scopeName}`);

    // Create a block symbol to represent this scope
    const blockSymbol: ApexSymbol = {
      name: scopeName,
      kind: SymbolKind.Method, // Use Method kind to represent a block scope
      location: this.getLocation(ctx),
      modifiers: this.createDefaultModifiers(),
      parent: this.currentMethodSymbol || this.currentTypeSymbol,
    };

    // Add block symbol to current scope
    this.symbolTable.addSymbol(blockSymbol);
  }

  /**
   * Called when exiting a block
   */
  exitBlock(): void {
    // Exit block scope
    const currentScope = this.symbolTable.getCurrentScope();
    this.logger.info(`Exiting block scope: ${currentScope.name}`);
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
      const name = ctx.id()?.text ?? 'unknown';
      this.logger.info(
        `Processing variable declarator: ${name}, kind: ${kind}, in scope: ${this.symbolTable.getCurrentScope().name}`,
      );

      // Check for duplicate variable declaration in current scope
      const existingSymbol = this.symbolTable.findSymbolInCurrentScope(name);
      if (existingSymbol) {
        this.addError(`Duplicate variable declaration: ${name}`, ctx);
        return;
      }

      // Get location
      const location = this.getLocation(ctx);

      // Create variable symbol
      const variableSymbol: VariableSymbol = {
        name,
        kind,
        location,
        modifiers,
        type,
        parent: this.currentMethodSymbol || this.currentTypeSymbol,
      };

      // Add to symbol table in the current scope (which could be a block scope)
      this.symbolTable.addSymbol(variableSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error processing variable declarator: ${errorMessage}`,
        ctx,
      );
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
   * Create a TypeInfo object from a type string
   */
  private createTypeInfo(typeString: string): TypeInfo {
    // For simplicity, we'll just create a primitive type
    // A more complete implementation would parse complex types
    return createPrimitiveType(typeString);
  }

  /**
   * Check if a symbol has a parent that is a class (meaning it's an inner class)
   * @param symbol The symbol to check, defaults to the current type symbol if not provided
   * @returns true if the symbol is an inner class, false otherwise
   */
  private hasClassParent(symbol?: TypeSymbol | null): boolean {
    // Use the provided symbol or fall back to current type symbol
    const symbolToCheck = symbol || this.currentTypeSymbol;

    // If no symbol to check, return false
    if (!symbolToCheck) {
      return false;
    }

    // Get the parent of the symbol
    const parent = symbolToCheck.parent;

    // For inner class detection, we need to check if the parent exists
    // and is a class (indicating that the symbolToCheck is an inner class)
    return parent !== null && parent.kind === SymbolKind.Class;
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
    this.logger.info(`Adding type symbol: ${name}, kind: ${kind}`);
    const typeSymbol: TypeSymbol = {
      name,
      kind,
      location: this.getLocation(ctx),
      modifiers,
      interfaces: [],
      parent: this.currentTypeSymbol,
      annotations: this.getCurrentAnnotations(),
    };

    // Add the type symbol to the current scope
    const currentScope = this.symbolTable.getCurrentScope();
    currentScope.addSymbol(typeSymbol);
    this.logger.info(
      `Added type symbol: ${name} to scope: ${currentScope.name}`,
    );

    return typeSymbol;
  }

  private createMethodSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
    returnType: TypeInfo,
  ): MethodSymbol {
    this.logger.info(
      `Adding method symbol: ${name}, return type: ${returnType.name}`,
    );
    const methodSymbol: MethodSymbol = {
      name,
      kind: SymbolKind.Method,
      location: this.getLocation(ctx),
      modifiers,
      returnType,
      parameters: [],
      parent: this.currentTypeSymbol,
      isConstructor: false,
      annotations: this.getCurrentAnnotations(),
    };

    // Add the method symbol to the current type scope
    if (this.currentTypeSymbol) {
      const typeScope = this.symbolTable.getCurrentScope();
      typeScope.addSymbol(methodSymbol);
      this.logger.info(
        `Added method symbol: ${name} to scope: ${this.currentTypeSymbol.name}`,
      );
    }

    return methodSymbol;
  }

  private createPropertySymbol(
    ctx: ParserRuleContext,
    name: string,
    kind: SymbolKind.Property | SymbolKind.Variable | SymbolKind.EnumValue,
    type: TypeInfo,
  ): VariableSymbol {
    this.logger.info(
      `Adding property symbol: ${name}, kind: ${kind}, type: ${type.name}`,
    );
    const propertySymbol: VariableSymbol = {
      name,
      kind,
      location: this.getLocation(ctx),
      modifiers: this.createDefaultModifiers(),
      type,
      parent: this.currentTypeSymbol,
    };

    // Add the property symbol to the current type scope
    if (this.currentTypeSymbol) {
      const typeScope = this.symbolTable.getCurrentScope();
      typeScope.addSymbol(propertySymbol);
      this.logger.info(
        `Added property symbol: ${name} to scope: ${this.currentTypeSymbol.name}`,
      );
    }

    return propertySymbol;
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

      // Enter trigger scope
      this.symbolTable.enterScope(name);
      this.logger.info(`Entered trigger scope: ${name}`);

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

      // Enter trigger scope
      this.symbolTable.enterScope(name);
      this.logger.info(`Entered trigger scope: ${name}`);

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
