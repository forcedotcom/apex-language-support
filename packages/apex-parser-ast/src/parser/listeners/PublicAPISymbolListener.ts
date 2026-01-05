/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ClassDeclarationContext,
  InterfaceDeclarationContext,
  MethodDeclarationContext,
  ConstructorDeclarationContext,
  FieldDeclarationContext,
  PropertyDeclarationContext,
  FormalParametersContext,
  TypeRefContext,
  ModifierContext,
  AnnotationContext,
  TriggerUnitContext,
  TriggerMemberDeclarationContext,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { Stack } from 'data-structure-typed';

import { LayeredSymbolListenerBase } from './LayeredSymbolListenerBase';
import { Namespaces, Namespace } from '../../namespace/NamespaceUtils';
import { TypeInfo, createPrimitiveType } from '../../types/typeInfo';
import { createTypeInfo } from '../../utils/TypeInfoFactory';
import {
  SymbolKind,
  SymbolLocation,
  SymbolModifiers,
  SymbolTable,
  SymbolVisibility,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  EnumSymbol,
  Annotation,
  SymbolFactory,
  ApexSymbol,
  ScopeSymbol,
  ScopeType,
  SymbolKey,
} from '../../types/symbol';
import { IdentifierValidator } from '../../semantics/validation/IdentifierValidator';
import { isBlockSymbol } from '../../utils/symbolNarrowing';

/**
 * Listener that captures only public/global symbols (Layer 1: Public API Surface)
 * This listener focuses on capturing the public API of classes, interfaces, enums, and triggers
 * without implementation details, enabling faster initial workspace loading.
 */
export class PublicAPISymbolListener extends LayeredSymbolListenerBase {
  private scopeStack: Stack<ApexSymbol> = new Stack<ApexSymbol>();
  private blockCounter: number = 0;
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();
  private currentAnnotations: Annotation[] = [];
  private currentNamespace: Namespace | null = null;
  protected projectNamespace: string | undefined = undefined;

  constructor(symbolTable?: SymbolTable) {
    super(symbolTable);
  }

  getDetailLevel(): 'public-api' {
    return 'public-api';
  }

  setProjectNamespace(namespace: string): void {
    this.projectNamespace = namespace;
    this.currentNamespace = namespace ? Namespaces.create(namespace) : null;
    this.logger.debug(() => `Set project namespace to: ${namespace}`);
  }

  /**
   * Called when entering a class declaration
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownClass';
      const modifiers = this.getCurrentModifiers();

      // Only process public/global classes
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Class,
        this.scopeStack.isEmpty(), // isTopLevel
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
      }

      // Get superclass and interfaces
      const superclass = ctx.typeRef()?.text;
      const interfaces =
        ctx
          .typeList()
          ?.typeRef()
          .map((t) => t.text) || [];

      // Create class symbol
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

      // Add annotations
      if (this.currentAnnotations.length > 0) {
        classSymbol.annotations = [...this.currentAnnotations];
      }

      // Add symbol to symbol table
      const isTopLevel = this.scopeStack.isEmpty();
      if (isTopLevel) {
        classSymbol.parentId = null;
      }
      this.addSymbolWithDetailLevel(classSymbol, this.getCurrentScopeSymbol());

      // Create class block symbol for scope tracking
      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(),
        name,
      );

      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in class declaration: ${errorMessage}`, ctx);
    }
  }

  exitClassDeclaration(): void {
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped) && popped.scopeType !== 'class') {
      this.logger.warn(
        `Expected class scope on exitClassDeclaration, but got ${popped.scopeType}`,
      );
    }
  }

  /**
   * Called when entering an interface declaration
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownInterface';
      const modifiers = this.getCurrentModifiers();

      // Only process public/global interfaces
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      const interfaces =
        ctx
          .typeList()
          ?.typeRef()
          .map((t) => t.text) || [];

      const interfaceSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Interface,
        modifiers,
      );

      interfaceSymbol.interfaces = interfaces;

      if (this.currentAnnotations.length > 0) {
        interfaceSymbol.annotations = [...this.currentAnnotations];
      }

      const isTopLevel = this.scopeStack.isEmpty();
      if (isTopLevel) {
        interfaceSymbol.parentId = null;
      }
      this.addSymbolWithDetailLevel(
        interfaceSymbol,
        this.getCurrentScopeSymbol(),
      );

      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(),
        name,
      );

      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in interface declaration: ${errorMessage}`, ctx);
    }
  }

  exitInterfaceDeclaration(): void {
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped) && popped.scopeType !== 'class') {
      this.logger.warn(
        `Expected class scope on exitInterfaceDeclaration, but got ${popped.scopeType}`,
      );
    }
  }

  /**
   * Called when entering a method declaration
   * Only captures public/global methods
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownMethod';
      const modifiers = this.getCurrentModifiers();

      // Only process public/global methods
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      const returnType = this.getReturnType(ctx);
      const parameters = this.extractParameters(ctx.formalParameters());

      const methodSymbol = this.createMethodSymbol(
        ctx,
        name,
        modifiers,
        returnType,
      );

      methodSymbol.parameters = parameters;

      if (this.currentAnnotations.length > 0) {
        methodSymbol.annotations = [...this.currentAnnotations];
      }

      this.addSymbolWithDetailLevel(methodSymbol, this.getCurrentScopeSymbol());

      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in method declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a constructor declaration
   * Only captures public/global constructors
   */
  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    try {
      // Extract constructor name from qualified name
      const qualifiedName = ctx.qualifiedName();
      const ids = qualifiedName?.id();
      const currentType = this.getCurrentType();
      const name =
        ids && ids.length > 0
          ? ids[0].text
          : (currentType?.name ?? 'unknownConstructor');

      const modifiers = this.getCurrentModifiers();

      // Only process public/global constructors
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      const parameters = this.extractParameters(ctx.formalParameters());

      const constructorSymbol = this.createConstructorSymbol(
        ctx,
        name,
        modifiers,
      );

      constructorSymbol.parameters = parameters;
      constructorSymbol.isConstructor = true;

      if (this.currentAnnotations.length > 0) {
        constructorSymbol.annotations = [...this.currentAnnotations];
      }

      this.addSymbolWithDetailLevel(
        constructorSymbol,
        this.getCurrentScopeSymbol(),
      );

      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in constructor declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a field declaration
   * Only captures public/global fields
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    try {
      const modifiers = this.getCurrentModifiers();

      // Only process public/global fields
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      const typeRef = ctx.typeRef();
      if (!typeRef) {
        return;
      }

      const type = this.createTypeInfoFromTypeRef(typeRef);
      const declarators = ctx.variableDeclarators()?.variableDeclarator() || [];

      for (const declarator of declarators) {
        const name = declarator.id()?.text;
        if (!name) {
          continue;
        }

        const fieldSymbol = this.createVariableSymbol(
          ctx,
          modifiers,
          name,
          SymbolKind.Field,
          type,
        );

        this.addSymbolWithDetailLevel(
          fieldSymbol,
          this.getCurrentScopeSymbol(),
        );
      }

      this.resetModifiers();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in field declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a property declaration
   * Only captures public/global properties
   */
  enterPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    try {
      const modifiers = this.getCurrentModifiers();

      // Only process public/global properties
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      const name = ctx.id()?.text;
      if (!name) {
        return;
      }

      const typeRef = ctx.typeRef();
      if (!typeRef) {
        return;
      }

      const type = this.createTypeInfoFromTypeRef(typeRef);

      const propertySymbol = this.createVariableSymbol(
        ctx,
        modifiers,
        name,
        SymbolKind.Property,
        type,
      );

      this.addSymbolWithDetailLevel(
        propertySymbol,
        this.getCurrentScopeSymbol(),
      );

      this.resetModifiers();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in property declaration: ${errorMessage}`, ctx);
    }
  }

  // Modifier and annotation tracking
  enterModifier(ctx: ModifierContext): void {
    const modifierText = ctx.text.toLowerCase();
    this.applyModifier(this.currentModifiers, modifierText);
  }

  exitModifier(): void {
    // Modifiers are applied immediately
  }

  enterAnnotation(ctx: AnnotationContext): void {
    // Extract annotation name similar to ApexSymbolCollectorListener
    const qn = ctx.qualifiedName?.();
    const ids = qn?.id();
    const name =
      ids && ids.length > 0
        ? ids.map((i) => i.text).join('.')
        : (ctx.text || '').replace(/^@/, '');

    const annotation: Annotation = {
      name,
      location: this.getLocation(ctx),
    };
    this.currentAnnotations.push(annotation);
  }

  exitAnnotation(): void {
    // Annotations are stored in currentAnnotations array
  }

  // Helper methods
  private getCurrentScopeSymbol(): ScopeSymbol | null {
    const peeked = this.scopeStack.peek();
    return isBlockSymbol(peeked) ? peeked : null;
  }

  private getCurrentType(): TypeSymbol | null {
    const stackArray = this.scopeStack.toArray();
    for (let i = stackArray.length - 1; i >= 0; i--) {
      const owner = stackArray[i];
      if (isBlockSymbol(owner) && owner.scopeType === 'class') {
        const typeSymbol = this.symbolTable
          .getAllSymbols()
          .find(
            (s) =>
              s.id === owner.parentId &&
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface ||
                s.kind === SymbolKind.Enum ||
                s.kind === SymbolKind.Trigger),
          );
        if (typeSymbol) {
          return typeSymbol as TypeSymbol;
        }
      }
    }
    return null;
  }

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
      isBuiltIn: false,
    };
  }

  private getCurrentModifiers(): SymbolModifiers {
    return { ...this.currentModifiers };
  }

  private resetModifiers(): void {
    this.currentModifiers = this.createDefaultModifiers();
  }

  private resetAnnotations(): void {
    this.currentAnnotations = [];
  }

  private getCurrentAnnotations(): Annotation[] {
    return [...this.currentAnnotations];
  }

  private getLocation(ctx: ParserRuleContext): SymbolLocation {
    const start = ctx.start;
    const stop = ctx.stop || start;

    // Try to extract identifier range from context (for method names, field names, etc.)
    const identifierRange = this.getIdentifierRange(ctx);

    return {
      symbolRange: {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + (stop.text?.length || 0),
      },
      identifierRange: identifierRange || {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: start.line,
        endColumn: start.charPositionInLine + (start.text?.length || 0),
      },
    };
  }

  /**
   * Extract the precise range of the identifier from a parser context
   * For method declarations, extracts the method name (id() node)
   * For other contexts, attempts to find the identifier node
   */
  private getIdentifierRange(ctx: ParserRuleContext): {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null {
    // Strategy 1: Check if the context has an id() method (most common case for methods)
    // Use a type-safe check similar to hasIdMethod
    if (
      ctx &&
      typeof ctx === 'object' &&
      'id' in ctx &&
      typeof (ctx as any).id === 'function'
    ) {
      const idNode = (ctx as any).id();
      if (idNode?.start && idNode?.stop) {
        return {
          startLine: idNode.start.line,
          startColumn: idNode.start.charPositionInLine,
          endLine: idNode.stop.line,
          endColumn:
            idNode.stop.charPositionInLine +
            (idNode.stop.text?.length || 0),
        };
      }
    }

    // Strategy 2: Check if context itself is an identifier (TerminalNode or similar)
    if (ctx.start === ctx.stop && ctx.start) {
      return {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.start.line,
        endColumn:
          ctx.start.charPositionInLine + (ctx.start.text?.length || 0),
      };
    }

    return null;
  }

  private generateBlockName(scopeType: ScopeType): string {
    this.blockCounter++;
    return `${scopeType}_${this.blockCounter}`;
  }

  private createTypeSymbol(
    ctx: ParserRuleContext,
    name: string,
    kind:
      | SymbolKind.Class
      | SymbolKind.Interface
      | SymbolKind.Enum
      | SymbolKind.Trigger,
    modifiers: SymbolModifiers,
  ): TypeSymbol | EnumSymbol {
    const location = this.getLocation(ctx);
    const parent = this.getCurrentType();
    const namespace = this.determineNamespaceForType(name, kind);

    const scopePath = this.symbolTable.getCurrentScopePath(
      this.getCurrentScopeSymbol(),
    );

    const typeSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      kind,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      undefined,
      namespace,
      this.getCurrentAnnotations(),
      scopePath,
    ) as TypeSymbol;

    return typeSymbol;
  }

  private createMethodSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
    returnType: TypeInfo,
  ): MethodSymbol {
    const location = this.getLocation(ctx);
    const parent = this.getCurrentType();
    const namespace = parent?.namespace || null;

    const scopePath = this.symbolTable.getCurrentScopePath(
      this.getCurrentScopeSymbol(),
    );

    const methodSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      SymbolKind.Method,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      undefined,
      namespace instanceof Namespace ? namespace : null,
      this.getCurrentAnnotations(),
      scopePath,
    ) as MethodSymbol;

    methodSymbol.returnType = returnType;
    methodSymbol.parameters = [];

    return methodSymbol;
  }

  private createConstructorSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
  ): MethodSymbol {
    const location = this.getLocation(ctx);
    const parent = this.getCurrentType();
    const namespace = parent?.namespace || null;

    const scopePath = this.symbolTable.getCurrentScopePath(
      this.getCurrentScopeSymbol(),
    );

    const constructorSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      SymbolKind.Constructor,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      undefined,
      namespace instanceof Namespace ? namespace : null,
      this.getCurrentAnnotations(),
      scopePath,
    ) as MethodSymbol;

    constructorSymbol.returnType = createPrimitiveType('void');
    constructorSymbol.parameters = [];
    constructorSymbol.isConstructor = true;

    return constructorSymbol;
  }

  private createVariableSymbol(
    ctx: ParserRuleContext,
    modifiers: SymbolModifiers,
    name: string,
    kind: SymbolKind.Field | SymbolKind.Property,
    type: TypeInfo,
  ): VariableSymbol {
    const location = this.getLocation(ctx);
    const parent = this.scopeStack.peek() || null;
    const namespace = parent?.namespace || null;

    const scopePath = this.symbolTable.getCurrentScopePath(
      this.getCurrentScopeSymbol(),
    );

    const variableSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      kind,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      undefined,
      namespace instanceof Namespace ? namespace : null,
      this.getCurrentAnnotations(),
      scopePath,
    ) as VariableSymbol;

    variableSymbol.type = type;

    return variableSymbol;
  }

  private createBlockSymbol(
    name: string,
    scopeType: ScopeType,
    location: SymbolLocation,
    parentScope: ScopeSymbol | null,
    semanticName?: string,
  ): ScopeSymbol | null {
    const fileUri = this.symbolTable.getFileUri();
    const scopePath = this.symbolTable.getCurrentScopePath(parentScope);

    // Find semantic symbol and determine parentId
    const currentType = this.getCurrentType();
    let parentId: string | null = null;
    if (currentType && scopeType === 'class') {
      parentId = currentType.id;
    } else if (parentScope) {
      parentId = parentScope.id;
    }

    // Create block symbol ID
    const id = SymbolFactory.generateId(name, fileUri, scopePath, 'block');

    const key: SymbolKey = {
      prefix: scopeType,
      name,
      path: scopePath ? [fileUri, ...scopePath, name] : [fileUri, name],
      unifiedId: id,
      fileUri,
      kind: SymbolKind.Block,
    };

    const modifiers = this.createDefaultModifiers();

    // For block symbols, symbolRange and identifierRange should be the same
    const blockLocation: SymbolLocation = {
      symbolRange: location.symbolRange,
      identifierRange: location.symbolRange,
    };

    const blockSymbol = SymbolFactory.createScopeSymbolByType(
      name,
      scopeType,
      blockLocation,
      fileUri,
      parentId,
      key,
      modifiers,
    );

    // Add block symbol to symbol table
    this.symbolTable.addSymbol(blockSymbol, parentScope ?? null);

    return blockSymbol;
  }

  private determineNamespaceForType(
    name: string,
    kind: SymbolKind,
  ): Namespace | null {
    if (this.currentFilePath && this.currentFilePath.startsWith('apexlib://')) {
      const match = this.currentFilePath.match(
        /apexlib:\/\/resources\/StandardApexLibrary\/([^\/]+)\//,
      );
      if (match) {
        const namespaceName = match[1];
        return Namespaces.create(namespaceName);
      }
    }

    const currentType = this.getCurrentType();
    if (!currentType) {
      return this.currentNamespace;
    }

    const parentNamespace = currentType.namespace;
    if (parentNamespace instanceof Namespace) {
      return parentNamespace;
    }
    return null;
  }

  private getReturnType(ctx: MethodDeclarationContext): TypeInfo {
    const typeRef = ctx.typeRef();
    if (typeRef) {
      return this.createTypeInfoFromTypeRef(typeRef);
    }
    return createPrimitiveType('void');
  }

  private createTypeInfoFromTypeRef(typeRef: TypeRefContext): TypeInfo {
    const typeText = typeRef.text || '';
    return createTypeInfo(typeText);
  }

  private extractParameters(
    formalParams: FormalParametersContext | undefined,
  ): VariableSymbol[] {
    if (!formalParams) {
      return [];
    }

    const paramList = formalParams.formalParameterList();
    if (!paramList) {
      return [];
    }

    const params: VariableSymbol[] = [];
    const paramContexts = paramList.formalParameter();

    for (const paramCtx of paramContexts) {
      const name = paramCtx.id()?.text;
      if (!name) {
        continue;
      }

      const typeRef = paramCtx.typeRef();
      if (!typeRef) {
        continue;
      }

      const type = this.createTypeInfoFromTypeRef(typeRef);
      const modifiers = this.getCurrentModifiers();

      const paramSymbol = SymbolFactory.createFullSymbolWithNamespace(
        name,
        SymbolKind.Parameter,
        this.getLocation(paramCtx),
        this.currentFilePath,
        modifiers,
        null, // Parameters will be set as children of method
        undefined,
        null,
        [],
        [],
      ) as VariableSymbol;

      paramSymbol.type = type;
      params.push(paramSymbol);
    }

    return params;
  }

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
      case 'webservice':
        modifiers.isWebService = true;
        break;
    }
  }

  private createValidationScope(): any {
    // Simplified validation scope for identifier validation
    return {
      currentType: this.getCurrentType(),
      currentMethod: null,
    };
  }

  /**
   * Called when entering a trigger unit
   */
  enterTriggerUnit(ctx: TriggerUnitContext): void {
    try {
      // Get the trigger name from the first id
      const name = ctx.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Triggers are typically public/global, so only process if visibility matches
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      // Create trigger symbol
      const triggerSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Trigger,
        modifiers,
      );

      // Add symbol to current scope (null when stack is empty = file level)
      this.addSymbolWithDetailLevel(
        triggerSymbol,
        this.getCurrentScopeSymbol(),
      );

      // Create trigger block symbol directly (stack-only scope tracking)
      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(),
        name, // Pass the trigger name so createBlockSymbol can find the trigger symbol
      );

      // Push block symbol onto stack
      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(() => `Error in trigger declaration: ${errorMessage}`);
    }
  }

  /**
   * Called when exiting a trigger unit
   */
  exitTriggerUnit(): void {
    // Pop from stack and validate it's a class scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'class') {
        this.logger.warn(
          () =>
            `Expected class scope on exitTriggerUnit, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Called when entering a trigger member declaration
   */
  enterTriggerMemberDeclaration(ctx: TriggerMemberDeclarationContext): void {
    try {
      // Get the trigger name from the parent context
      const triggerUnit = ctx.parent?.parent as TriggerUnitContext;
      const name = triggerUnit?.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Triggers are typically public/global
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      // Create trigger symbol
      const triggerSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Trigger,
        modifiers,
      );

      // Add symbol to current scope (null when stack is empty = file level)
      this.addSymbolWithDetailLevel(
        triggerSymbol,
        this.getCurrentScopeSymbol(),
      );

      // Create trigger block symbol directly (stack-only scope tracking)
      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(),
        name, // Pass the trigger name so createBlockSymbol can find the trigger symbol
      );

      // Push block symbol onto stack
      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

      // Reset annotations for the next symbol
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(() => `Error in trigger declaration: ${errorMessage}`);
    }
  }

  /**
   * Called when exiting a trigger member declaration
   */
  exitTriggerMemberDeclaration(): void {
    // Pop from stack and validate it's a class scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'class') {
        this.logger.warn(
          () =>
            `Expected class scope on exitTriggerMemberDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Create a new instance of this listener with a fresh SymbolTable
   */
  createNewInstance(): PublicAPISymbolListener {
    const newTable = new SymbolTable();
    return new PublicAPISymbolListener(newTable);
  }
}
