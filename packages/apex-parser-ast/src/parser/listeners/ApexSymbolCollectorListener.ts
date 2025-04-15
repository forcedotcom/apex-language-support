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
  AnnotationContext,
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
  Annotation,
  AnnotationParameter,
} from '../../types/symbol.js';
import {
  ClassModifierValidator,
  MethodModifierValidator,
  FieldModifierValidator,
  ErrorReporter,
} from '../../sematics/modifiers/index.js';
import { calculateFQN } from '../../utils/FQNUtils.js';

/**
 * A listener that collects symbols from Apex code and organizes them into symbol tables.
 * This listener builds a hierarchy of symbol scopes and tracks symbols defined in each scope.
 */
export class ApexSymbolCollectorListener
  extends BaseApexParserListener<SymbolTable>
  implements ErrorReporter
{
  private symbolTable: SymbolTable = new SymbolTable();
  private currentTypeSymbol: TypeSymbol | null = null;
  private currentMethodSymbol: MethodSymbol | null = null;
  private blockDepth: number = 0;
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();
  private currentAnnotations: Annotation[] = [];

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
   * Called when entering an annotation
   * The parser will call this for each annotation it encounters
   */
  enterAnnotation(ctx: AnnotationContext): void {
    try {
      // Extract the annotation name (remove @ symbol)
      const annotationText = ctx.text;
      const nameWithoutAt = annotationText.startsWith('@')
        ? annotationText.substring(1)
        : annotationText;

      // Extract the name part (before any parameters)
      let name = nameWithoutAt;
      const parameters: AnnotationParameter[] = [];

      // Parse parameters if present
      // Format examples: @isTest, @RestResource(urlMapping='/api/records')
      const paramStart = nameWithoutAt.indexOf('(');
      if (paramStart > 0) {
        name = nameWithoutAt.substring(0, paramStart);

        // Extract parameters string (between parentheses)
        const paramEnd = nameWithoutAt.lastIndexOf(')');
        if (paramEnd > paramStart) {
          const paramsStr = nameWithoutAt.substring(paramStart + 1, paramEnd);

          // Parse parameters (comma-separated)
          const paramPairs = paramsStr.split(',');
          for (const pair of paramPairs) {
            const equalsPos = pair.indexOf('=');
            if (equalsPos > 0) {
              // Named parameter: key=value
              const paramName = pair.substring(0, equalsPos).trim();
              const paramValue = pair.substring(equalsPos + 1).trim();
              parameters.push({
                name: paramName,
                value: this.cleanAnnotationValue(paramValue),
              });
            } else if (pair.trim()) {
              // Positional parameter: just value
              parameters.push({
                value: this.cleanAnnotationValue(pair.trim()),
              });
            }
          }
        }
      }

      // Create and store the annotation
      const annotation: Annotation = {
        name,
        location: this.getLocation(ctx),
        parameters: parameters.length > 0 ? parameters : undefined,
      };

      this.currentAnnotations.push(annotation);

      // Special case for @isTest annotation - set the isTestMethod flag
      if (name.toLowerCase() === 'istest') {
        this.currentModifiers.isTestMethod = true;
      }
    } catch (e) {
      // Log parsing error but continue
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error parsing annotation: ${ctx.text}. ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Remove quotes around annotation values if present
   */
  private cleanAnnotationValue(value: string): string {
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      return value.substring(1, value.length - 1);
    }
    return value;
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

    // Get current annotations
    const annotations = this.getCurrentAnnotations();

    // Validate class visibility modifiers
    ClassModifierValidator.validateClassVisibilityModifiers(
      className,
      modifiers,
      ctx,
      this.isInnerClass(),
      this.currentTypeSymbol,
      this,
    );

    this.resetModifiers();
    this.resetAnnotations();

    // Create type symbol
    const typeSymbol: TypeSymbol = {
      name: className,
      kind: SymbolKind.Class,
      location,
      modifiers,
      interfaces: [],
      parent: null,
      annotations: annotations.length > 0 ? annotations : undefined,
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

    // Get current annotations
    const annotations = this.getCurrentAnnotations();

    // Validate interface visibility modifiers
    ClassModifierValidator.validateInterfaceVisibilityModifiers(
      interfaceName,
      modifiers,
      ctx,
      this.isInnerClass(),
      this.currentTypeSymbol,
      this,
    );

    this.resetModifiers();
    this.resetAnnotations();

    // Create type symbol
    const typeSymbol: TypeSymbol = {
      name: interfaceName,
      kind: SymbolKind.Interface,
      location,
      modifiers,
      interfaces: [],
      parent: null,
      annotations: annotations.length > 0 ? annotations : undefined,
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
      MethodModifierValidator.validateMethodOverride(methodName, ctx, this);
    }

    // Validate method modifiers
    MethodModifierValidator.validateMethodModifiers(
      methodName,
      modifiers,
      ctx,
      this.currentTypeSymbol,
      this,
    );

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
    MethodModifierValidator.validateInterfaceMethodModifiers(
      currentModifiers,
      ctx,
      this,
    );

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

    // Get field type
    const typeCtx = ctx.typeRef();
    if (!typeCtx) return;

    const typeText = this.getTextFromContext(typeCtx);
    const type = this.createTypeInfo(typeText);

    // Get current modifiers and reset for next declaration
    const modifiers = this.getCurrentModifiers();

    // Validate field visibility modifiers (do this before creating individual property symbols)
    FieldModifierValidator.validateFieldVisibilityModifiers(
      modifiers,
      ctx,
      this.currentTypeSymbol,
      this,
    );

    this.resetModifiers();

    // Process the variable declarators (there can be multiple fields in one declaration)
    const varDeclCtxs = ctx.variableDeclarators()?.variableDeclarator() || [];
    for (const varDeclCtx of varDeclCtxs) {
      this.processVariableDeclarator(
        varDeclCtx,
        type,
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
      parent: null,
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

    // Create variable symbol with parent fallback to null
    const parent = this.currentTypeSymbol || this.currentMethodSymbol || null;

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
      // Variable initialization will be handled in the future
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
   * Check if current class appears to be an inner class
   * A class is an inner class if it's not directly in the global scope
   */
  private isInnerClass(): boolean {
    // If we're currently processing a class and there's already a type symbol
    // on the stack, this is likely an inner class
    if (!this.currentTypeSymbol) {
      return false;
    }

    // Check if there are class/interface symbols in the parent scopes
    // This is a simplistic approach - a more robust approach would track nesting explicitly
    const currentScope = this.symbolTable.getCurrentScope();
    const parentScope = currentScope.parent;
    if (!parentScope) {
      return false;
    }

    // If the parent scope is not the global scope, this is likely an inner class
    return parentScope.name !== 'global';
  }

  /**
   * Add a warning message to the list of warnings (public implementation of ErrorReporter interface)
   */
  public addWarning(message: string, context?: ParserRuleContext): void {
    super.addWarning(message, context);
  }

  /**
   * Add a semantic error through the error listener (public implementation of ErrorReporter interface)
   */
  public addError(
    message: string,
    context:
      | ParserRuleContext
      | { line: number; column: number; endLine?: number; endColumn?: number },
  ): void {
    super.addError(message, context);
  }

  private addTypeSymbol(
    ctx: ParserRuleContext,
    name: string,
    kind: SymbolKind.Class | SymbolKind.Interface | SymbolKind.Trigger,
    modifiers: SymbolModifiers,
  ): TypeSymbol {
    const typeSymbol: TypeSymbol = {
      name,
      kind,
      location: this.getLocation(ctx),
      modifiers,
      parent: this.currentTypeSymbol,
      interfaces: [],
    };

    // Calculate and set the FQN using the project namespace
    typeSymbol.fqn = calculateFQN(typeSymbol, {
      defaultNamespace: this.projectNamespace,
    });

    // Add to symbol table
    this.symbolTable.addSymbol(typeSymbol);

    return typeSymbol;
  }

  private addMethodSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
    returnType: TypeInfo,
  ): MethodSymbol {
    const methodSymbol: MethodSymbol = {
      name,
      kind: SymbolKind.Method,
      location: this.getLocation(ctx),
      modifiers,
      parent: this.currentTypeSymbol,
      parameters: [],
      returnType,
    };

    // Calculate and set the FQN using the project namespace
    methodSymbol.fqn = calculateFQN(methodSymbol, {
      defaultNamespace: this.projectNamespace,
    });

    // Add to symbol table
    this.symbolTable.addSymbol(methodSymbol);

    return methodSymbol;
  }

  private addPropertySymbol(
    ctx: ParserRuleContext,
    name: string,
    kind: SymbolKind.Property | SymbolKind.Variable | SymbolKind.EnumValue,
    modifiers: SymbolModifiers,
    type: TypeInfo,
  ): VariableSymbol {
    const propertySymbol: VariableSymbol = {
      name,
      kind,
      location: this.getLocation(ctx),
      modifiers,
      parent: this.currentTypeSymbol,
      type,
    };

    // Calculate and set the FQN using the project namespace
    propertySymbol.fqn = calculateFQN(propertySymbol, {
      defaultNamespace: this.projectNamespace,
    });

    // Add to symbol table
    this.symbolTable.addSymbol(propertySymbol);

    return propertySymbol;
  }
}
