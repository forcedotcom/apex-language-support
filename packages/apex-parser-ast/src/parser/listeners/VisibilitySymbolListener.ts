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
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { Stack } from 'data-structure-typed';
import { ApexReferenceCollectorListener } from './ApexReferenceCollectorListener';

import { LayeredSymbolListenerBase, DetailLevel } from './LayeredSymbolListenerBase';
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
 * Consolidated listener for visibility-based symbol collection.
 * Replaces PublicAPISymbolListener, ProtectedSymbolListener, and PrivateSymbolListener
 * with a single parameterized class that only differs by DetailLevel.
 *
 * This listener captures symbols based on visibility:
 * - 'public-api': Public/global symbols and creates TypeSymbol objects (classes/interfaces/enums/triggers)
 * - 'protected': Protected/default visibility symbols (enriches existing symbols)
 * - 'private': Private symbols (enriches existing symbols)
 */
export class VisibilitySymbolListener extends LayeredSymbolListenerBase {
  private readonly detailLevel: DetailLevel;
  private scopeStack: Stack<ApexSymbol> = new Stack<ApexSymbol>();
  private blockCounter: number = 0;
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();
  private currentAnnotations: Annotation[] = [];
  private currentNamespace: Namespace | null = null;
  protected projectNamespace: string | undefined = undefined;

  constructor(detailLevel: DetailLevel, symbolTable?: SymbolTable) {
    super(symbolTable);
    if (
      detailLevel !== 'public-api' &&
      detailLevel !== 'protected' &&
      detailLevel !== 'private'
    ) {
      throw new Error(
        `VisibilitySymbolListener only supports 'public-api', 'protected', or 'private' detail levels. Got: ${detailLevel}`,
      );
    }
    this.detailLevel = detailLevel;
  }

  getDetailLevel(): DetailLevel {
    return this.detailLevel;
  }

  setProjectNamespace(namespace: string): void {
    this.projectNamespace = namespace;
    this.currentNamespace = namespace ? Namespaces.create(namespace) : null;
    this.logger.debug(() => `Set project namespace to: ${namespace}`);
  }

  /**
   * Called when entering a class declaration
   * Only creates TypeSymbol if detailLevel is 'public-api'
   * Otherwise, only tracks scope for symbol enrichment
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownClass';
      const modifiers = this.getCurrentModifiers();

      // Only process symbols matching this listener's visibility
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      // Only create TypeSymbol for public-api level
      if (this.detailLevel === 'public-api') {
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
      }

      // Create class block symbol for scope tracking (all levels need this)
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
   * Only creates TypeSymbol if detailLevel is 'public-api'
   * Otherwise, only tracks scope for symbol enrichment
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownInterface';
      const modifiers = this.getCurrentModifiers();

      // Only process symbols matching this listener's visibility
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      // Only create TypeSymbol for public-api level
      if (this.detailLevel === 'public-api') {
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
      }

      // Create interface block symbol for scope tracking (all levels need this)
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
   * Captures methods matching this listener's visibility level
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownMethod';
      const modifiers = this.getCurrentModifiers();

      // Only process methods matching this listener's visibility
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

      // Create method block for scope tracking (only for private level)
      if (this.detailLevel === 'private') {
        const location = this.getLocation(ctx);
        const blockSymbol = this.createBlockSymbol(
          name,
          'method',
          location,
          this.getCurrentScopeSymbol(),
        );

        if (blockSymbol) {
          this.scopeStack.push(blockSymbol);
        }
      }

      // Delegate reference collection for return type
      const returnTypeRef = (ctx as any).typeRef?.();
      if (returnTypeRef) {
        const walker = new ParseTreeWalker();
        const refCollector = new ApexReferenceCollectorListener(
          this.symbolTable,
        );
        refCollector.setCurrentFileUri(this.currentFilePath);
        refCollector.setParentContext(
          name, // Method name
          this.getCurrentType()?.name, // Type name
        );
        walker.walk(refCollector, returnTypeRef); // Walk return type subtree
      }

      // Delegate reference collection for parameter types
      const formalParams = ctx.formalParameters();
      if (formalParams) {
        const walker = new ParseTreeWalker();
        const refCollector = new ApexReferenceCollectorListener(
          this.symbolTable,
        );
        refCollector.setCurrentFileUri(this.currentFilePath);
        refCollector.setParentContext(
          name, // Method name
          this.getCurrentType()?.name, // Type name
        );
        walker.walk(refCollector, formalParams); // Walk parameters subtree
      }

      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in method declaration: ${errorMessage}`, ctx);
    }
  }

  exitMethodDeclaration(): void {
    if (this.detailLevel === 'private') {
      const popped = this.scopeStack.pop();
      if (isBlockSymbol(popped) && popped.scopeType !== 'method') {
        this.logger.warn(
          `Expected method scope on exitMethodDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Called when entering a constructor declaration
   * Captures constructors matching this listener's visibility level
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

      // Only process constructors matching this listener's visibility
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

      // Create constructor block for scope tracking (only for private level)
      if (this.detailLevel === 'private') {
        const location = this.getLocation(ctx);
        const blockSymbol = this.createBlockSymbol(
          name,
          'method',
          location,
          this.getCurrentScopeSymbol(),
        );

        if (blockSymbol) {
          this.scopeStack.push(blockSymbol);
        }
      }

      // Delegate reference collection for parameter types
      const formalParams = ctx.formalParameters();
      if (formalParams) {
        const walker = new ParseTreeWalker();
        const refCollector = new ApexReferenceCollectorListener(
          this.symbolTable,
        );
        refCollector.setCurrentFileUri(this.currentFilePath);
        refCollector.setParentContext(
          name, // Constructor name
          this.getCurrentType()?.name, // Type name
        );
        walker.walk(refCollector, formalParams); // Walk parameters subtree
      }

      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in constructor declaration: ${errorMessage}`, ctx);
    }
  }

  exitConstructorDeclaration(): void {
    if (this.detailLevel === 'private') {
      const popped = this.scopeStack.pop();
      if (isBlockSymbol(popped) && popped.scopeType !== 'method') {
        this.logger.warn(
          `Expected method scope on exitConstructorDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Called when entering a field declaration
   * Captures fields matching this listener's visibility level
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    try {
      const modifiers = this.getCurrentModifiers();

      // Only process fields matching this listener's visibility
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

      // Delegate reference collection to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      refCollector.setParentContext(
        undefined, // Fields are at class level, not in methods
        this.getCurrentType()?.name, // Type name
      );
      walker.walk(refCollector, ctx); // Walk only this subtree

      this.resetModifiers();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in field declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a property declaration
   * Captures properties matching this listener's visibility level
   */
  enterPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    try {
      const modifiers = this.getCurrentModifiers();

      // Only process properties matching this listener's visibility
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

      // Delegate reference collection to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      refCollector.setParentContext(
        undefined, // Properties are at class level, not in methods
        this.getCurrentType()?.name, // Type name
      );
      walker.walk(refCollector, ctx); // Walk only this subtree

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

  /**
   * Called when entering a trigger unit
   * Only creates TypeSymbol if detailLevel is 'public-api'
   * Otherwise, only tracks scope for symbol enrichment
   */
  enterTriggerUnit(ctx: TriggerUnitContext): void {
    try {
      // Get the trigger name from the first id
      const name = ctx.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Only process triggers matching this listener's visibility
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      // Only create TypeSymbol for public-api level
      if (this.detailLevel === 'public-api') {
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
      }

      // Create trigger block symbol for scope tracking (all levels need this)
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
   * Only creates TypeSymbol if detailLevel is 'public-api'
   * Otherwise, only tracks scope for symbol enrichment
   */
  enterTriggerMemberDeclaration(ctx: TriggerMemberDeclarationContext): void {
    try {
      // Get the trigger name from the parent context
      const triggerUnit = ctx.parent?.parent as TriggerUnitContext;
      const name = triggerUnit?.id(0)?.text ?? 'unknownTrigger';
      const modifiers = this.getCurrentModifiers();

      // Only process triggers matching this listener's visibility
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      // Only create TypeSymbol for public-api level
      if (this.detailLevel === 'public-api') {
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
      }

      // Create trigger block symbol for scope tracking (all levels need this)
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
            idNode.stop.charPositionInLine + (idNode.stop.text?.length || 0),
        };
      }
    }

    // Strategy 2: Check if context itself is an identifier (TerminalNode or similar)
    if (ctx.start === ctx.stop && ctx.start) {
      return {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.start.line,
        endColumn: ctx.start.charPositionInLine + (ctx.start.text?.length || 0),
      };
    }

    return null;
  }

  private generateBlockName(scopeType: ScopeType): string {
    this.blockCounter++;
    return `${scopeType}_${this.blockCounter}`;
  }

  /**
   * Create a type symbol (class, interface, enum, trigger)
   * Only used when detailLevel is 'public-api'
   */
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

  /**
   * Determine namespace for a type symbol
   * Only used when detailLevel is 'public-api'
   */
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

  /**
   * Create validation scope for identifier validation
   * Only used when detailLevel is 'public-api'
   */
  private createValidationScope(): any {
    // Simplified validation scope for identifier validation
    return {
      currentType: this.getCurrentType(),
      currentMethod: null,
    };
  }

  /**
   * Create a new instance of this listener with a fresh SymbolTable
   */
  createNewInstance(): VisibilitySymbolListener {
    const newTable = new SymbolTable();
    return new VisibilitySymbolListener(this.detailLevel, newTable);
  }
}

