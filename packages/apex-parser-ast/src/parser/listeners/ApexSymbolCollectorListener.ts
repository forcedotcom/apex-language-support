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
  InterfaceDeclarationContext,
  MethodDeclarationContext,
  VariableDeclaratorContext,
  LocalVariableDeclarationContext,
  EnumDeclarationContext,
  FormalParameterContext,
  BlockContext,
  InterfaceMethodDeclarationContext,
  ModifierContext,
  ConstructorDeclarationContext,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';

import { BaseApexParserListener } from './BaseApexParserListener.js';
import { TypeInfo, createPrimitiveType } from '../../types/typeInfo.js';
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
} from '../../types/symbol.js';

/**
 * A listener that collects symbols from Apex code and organizes them into symbol tables.
 * This listener builds a hierarchy of symbol scopes and tracks symbols defined in each scope.
 */
export class ApexSymbolCollectorListener extends BaseApexParserListener<SymbolTable> {
  private symbolTable: SymbolTable = new SymbolTable();
  private currentTypeSymbol: TypeSymbol | null = null;
  private currentMethodSymbol: MethodSymbol | null = null;
  private blockDepth: number = 0;
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();

  /**
   * Get the collected symbol table
   */
  getResult(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Create a new instance of this listener
   */
  createNewInstance(): BaseApexParserListener<SymbolTable> {
    return new ApexSymbolCollectorListener();
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
   * Called when entering a modifier
   * The parser will call this for each modifier it encounters
   */
  enterModifier(ctx: ModifierContext): void {
    this.applyModifier(this.currentModifiers, ctx.text);

    // Special case for interface methods with private modifier
    if (
      this.currentTypeSymbol?.kind === SymbolKind.Interface &&
      ctx.text.toLowerCase() === 'private'
    ) {
      this.addError('Interface method cannot be private', ctx);
    }
  }

  /**
   * Called when entering a class declaration
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    // Modifiers are collected by enterModifier before this is called
    const className = ctx.id()?.text ?? 'UnknownClass';

    // Get location information
    const location = this.getLocation(ctx);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Create type symbol
    const typeSymbol: TypeSymbol = {
      name: className,
      kind: SymbolKind.Class,
      location,
      modifiers,
      interfaces: [],
    };

    // Add to symbol table and enter scope
    this.symbolTable.addSymbol(typeSymbol);
    this.symbolTable.enterScope(className);

    // Track current type
    this.currentTypeSymbol = typeSymbol;
  }

  /**
   * Called when exiting a class declaration
   */
  exitClassDeclaration(): void {
    // Exit the class scope
    this.symbolTable.exitScope();
    this.currentTypeSymbol = null;
  }

  /**
   * Called when entering an interface declaration
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    // Modifiers are collected by enterModifier before this is called
    const interfaceName = ctx.id()?.text ?? 'UnknownInterface';

    // Get location information
    const location = this.getLocation(ctx);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Create type symbol
    const typeSymbol: TypeSymbol = {
      name: interfaceName,
      kind: SymbolKind.Interface,
      location,
      modifiers,
      interfaces: [],
    };

    // Add to symbol table and enter scope
    this.symbolTable.addSymbol(typeSymbol);
    this.symbolTable.enterScope(interfaceName);

    // Track current type
    this.currentTypeSymbol = typeSymbol;
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
   * Called when entering a method declaration
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    if (!this.currentTypeSymbol) return;

    // Modifiers are collected by enterModifier before this is called
    const methodName = ctx.id()?.text ?? 'unknownMethod';

    // Get return type
    const returnTypeCtx = ctx.typeRef();
    const returnTypeText = returnTypeCtx
      ? this.getTextFromContext(returnTypeCtx)
      : 'void';
    const returnType = this.createTypeInfo(returnTypeText);

    // Get location
    const location = this.getLocation(ctx);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Check for method override conflicts
    if (modifiers.isOverride) {
      this.validateMethodOverride(methodName, ctx);
    }

    // Validate method modifiers
    this.validateMethodModifiers(methodName, modifiers, ctx);

    // Check for duplicate method names in the current scope
    const existingSymbol =
      this.symbolTable.findSymbolInCurrentScope(methodName);
    if (existingSymbol && existingSymbol.kind === SymbolKind.Method) {
      // Report a semantic error for duplicate method declaration
      this.addError(
        `Duplicate method declaration: '${methodName}' is already defined in this class`,
        ctx,
      );
    }

    // Create method symbol
    const methodSymbol: MethodSymbol = {
      name: methodName,
      kind: SymbolKind.Method,
      location,
      modifiers,
      returnType,
      parameters: [],
      parent: this.currentTypeSymbol,
      isConstructor: false,
    };

    // Add to symbol table and enter method scope
    this.symbolTable.addSymbol(methodSymbol);
    this.symbolTable.enterScope(methodName);

    // Store current method
    this.currentMethodSymbol = methodSymbol;

    // Process parameters (will be done in enterFormalParameter)
  }

  /**
   * Validate method modifiers for semantic errors
   */
  private validateMethodModifiers(
    methodName: string,
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
  ): void {
    // Check for conflicting modifiers
    if (modifiers.isAbstract && modifiers.isVirtual) {
      this.addError(
        `Method '${methodName}' cannot be both abstract and virtual`,
        ctx,
      );
    }

    if (modifiers.isAbstract && modifiers.isFinal) {
      this.addError(
        `Method '${methodName}' cannot be both abstract and final`,
        ctx,
      );
    }

    if (modifiers.isVirtual && modifiers.isFinal) {
      this.addError(
        `Method '${methodName}' cannot be both virtual and final`,
        ctx,
      );
    }

    if (modifiers.isAbstract && modifiers.isOverride) {
      this.addError(
        `Method '${methodName}' cannot be both abstract and override`,
        ctx,
      );
    }

    // Check for abstract methods in non-abstract classes
    if (
      modifiers.isAbstract &&
      this.currentTypeSymbol &&
      this.currentTypeSymbol.kind === SymbolKind.Class &&
      !this.currentTypeSymbol.modifiers.isAbstract
    ) {
      this.addError(
        `Abstract method '${methodName}' cannot be declared in non-abstract class`,
        ctx,
      );
    }
  }

  /**
   * Validate method override for semantic errors
   */
  private validateMethodOverride(
    methodName: string,
    ctx: ParserRuleContext,
  ): void {
    // In a real implementation, we would check that:
    // 1. The parent class actually has a method with this name
    // 2. The method signatures are compatible
    // 3. The overridden method is virtual or abstract

    // For now, just add a placeholder warning
    this.addWarning(
      `Override method '${methodName}' should ensure a parent class has a compatible virtual or abstract method`,
      ctx,
    );
  }

  /**
   * Called when exiting a method declaration
   */
  exitMethodDeclaration(): void {
    // Exit method scope
    this.symbolTable.exitScope();
    this.currentMethodSymbol = null;
  }

  /**
   * Called when entering a constructor declaration
   */
  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    if (!this.currentTypeSymbol) return;

    // Modifiers are collected by enterModifier before this is called
    const constructorName = this.currentTypeSymbol.name;

    // Get location
    const location = this.getLocation(ctx);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
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
   * Called when exiting a constructor declaration
   */
  exitConstructorDeclaration(): void {
    // Exit constructor scope
    this.symbolTable.exitScope();
    this.currentMethodSymbol = null;
  }

  /**
   * Called when entering an interface method declaration
   */
  enterInterfaceMethodDeclaration(
    ctx: InterfaceMethodDeclarationContext,
  ): void {
    if (!this.currentTypeSymbol) return;

    // Check for explicit modifiers on interface methods (not allowed in Apex)
    const currentModifiers = this.getCurrentModifiers();

    // Validate interface method modifiers
    this.validateInterfaceMethodModifiers(currentModifiers, ctx);

    // Interface methods have implicit modifiers
    this.resetModifiers();
    this.currentModifiers.visibility = SymbolVisibility.Public;
    this.currentModifiers.isAbstract = true;

    const methodName = ctx.id()?.text ?? 'unknownMethod';

    // Get return type
    const returnTypeCtx = ctx.typeRef();
    const returnTypeText = returnTypeCtx
      ? this.getTextFromContext(returnTypeCtx)
      : 'void';
    const returnType = this.createTypeInfo(returnTypeText);

    // Get location
    const location = this.getLocation(ctx);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Check for duplicate interface method names
    const existingSymbol =
      this.symbolTable.findSymbolInCurrentScope(methodName);
    if (existingSymbol && existingSymbol.kind === SymbolKind.Method) {
      // Report a semantic error for duplicate method declaration
      this.addError(
        `Duplicate method declaration: '${methodName}' is already defined in this interface`,
        ctx,
      );
    }

    // Create method symbol
    const methodSymbol: MethodSymbol = {
      name: methodName,
      kind: SymbolKind.Method,
      location,
      modifiers,
      returnType,
      parameters: [],
      parent: this.currentTypeSymbol,
      isConstructor: false,
    };

    // Add to symbol table and enter method scope
    this.symbolTable.addSymbol(methodSymbol);
    this.symbolTable.enterScope(methodName);

    // Store current method
    this.currentMethodSymbol = methodSymbol;
  }

  /**
   * Validate interface method modifiers
   */
  private validateInterfaceMethodModifiers(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
  ): void {
    // Report errors for any explicit modifiers
    if (modifiers.visibility !== SymbolVisibility.Default) {
      this.addError(
        `Interface method cannot be ${this.visibilityToString(modifiers.visibility)}`,
        ctx,
      );
    }

    if (modifiers.isStatic) {
      this.addError(
        "Modifier 'static' is not allowed on interface methods",
        ctx,
      );
    }

    if (modifiers.isFinal) {
      this.addError(
        "Modifier 'final' is not allowed on interface methods",
        ctx,
      );
    }

    if (modifiers.isAbstract) {
      this.addError(
        "Modifier 'abstract' is not allowed on interface methods",
        ctx,
      );
    }

    if (modifiers.isVirtual) {
      this.addError(
        "Modifier 'virtual' is not allowed on interface methods",
        ctx,
      );
    }

    if (modifiers.isOverride) {
      this.addError(
        "Modifier 'override' is not allowed on interface methods",
        ctx,
      );
    }

    if (modifiers.isTransient) {
      this.addError(
        "Modifier 'transient' is not allowed on interface methods",
        ctx,
      );
    }

    if (modifiers.isTestMethod) {
      this.addError(
        "Modifier 'testMethod' is not allowed on interface methods",
        ctx,
      );
    }

    if (modifiers.isWebService) {
      this.addError(
        "Modifier 'webService' is not allowed on interface methods",
        ctx,
      );
    }
  }

  /**
   * Called when exiting an interface method declaration
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
    if (!this.currentTypeSymbol) return;

    // Modifiers are collected by enterModifier before this is called
    const fieldTypeText = ctx.typeRef()
      ? this.getTextFromContext(ctx.typeRef())
      : 'Object';
    const fieldType = this.createTypeInfo(fieldTypeText);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Process each field variable declared
    const variableDeclarators = ctx.variableDeclarators().variableDeclarator();
    for (const declarator of variableDeclarators) {
      this.processVariableDeclarator(
        declarator,
        fieldType,
        modifiers,
        SymbolKind.Property,
      );
    }
  }

  /**
   * Called when entering a local variable declaration
   */
  enterLocalVariableDeclaration(ctx: LocalVariableDeclarationContext): void {
    if (this.blockDepth === 0) return;

    // Modifiers will be collected by enterModifier before this is called
    const varTypeText = ctx.typeRef()
      ? this.getTextFromContext(ctx.typeRef())
      : 'Object';
    const varType = this.createTypeInfo(varTypeText);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Process each variable declared
    const variableDeclarators = ctx.variableDeclarators().variableDeclarator();
    for (const declarator of variableDeclarators) {
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
    // Modifiers are collected by enterModifier before this is called
    const enumName = ctx.id()?.text ?? 'UnknownEnum';

    // Get location information
    const location = this.getLocation(ctx);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();
    this.resetModifiers();

    // Create enum symbol
    const enumSymbol: EnumSymbol = {
      name: enumName,
      kind: SymbolKind.Enum,
      location,
      modifiers,
      values: [],
    };

    // Add to symbol table and enter enum scope
    this.symbolTable.addSymbol(enumSymbol);
    this.symbolTable.enterScope(enumName);

    // Process enum constants if present
    // This will be done by other handlers such as processVariableDeclarator
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

    // Create a new scope for blocks (except the top-level method block)
    if (this.blockDepth > 1) {
      this.symbolTable.enterScope(
        `block_${ctx.start.line}_${ctx.start.charPositionInLine}`,
      );
    }
  }

  /**
   * Called when exiting a block
   */
  exitBlock(): void {
    // Exit block scope (except the top-level method block)
    if (this.blockDepth > 1) {
      this.symbolTable.exitScope();
    }

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
    const varName = ctx.id()?.text ?? 'unknownVar';

    // Get location
    const location = this.getLocation(ctx);

    // Create variable symbol with parent fallback to undefined
    const parent =
      this.currentTypeSymbol || this.currentMethodSymbol || undefined;

    // Check for duplicate variable names in the current scope
    const existingSymbol = this.symbolTable.findSymbolInCurrentScope(varName);
    if (existingSymbol) {
      // Report a semantic error for duplicate variable declaration
      this.addError(
        `Duplicate variable declaration: '${varName}' is already defined in this scope`,
        ctx,
      );
    }

    // Create variable symbol
    const varSymbol: VariableSymbol = {
      name: varName,
      kind,
      location,
      modifiers,
      type,
      parent,
      // Cannot reliably access variableInitializer
      initialValue: undefined,
    };

    // Add to symbol table
    this.symbolTable.addSymbol(varSymbol);
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
   * Convert visibility enum to string representation
   */
  private visibilityToString(visibility: SymbolVisibility): string {
    switch (visibility) {
      case SymbolVisibility.Public:
        return 'public';
      case SymbolVisibility.Private:
        return 'private';
      case SymbolVisibility.Protected:
        return 'protected';
      case SymbolVisibility.Global:
        return 'global';
      default:
        return 'default';
    }
  }
}
