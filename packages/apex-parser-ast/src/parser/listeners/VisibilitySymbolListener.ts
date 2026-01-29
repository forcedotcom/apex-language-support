/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ClassDeclarationContext,
  InterfaceDeclarationContext,
  MethodDeclarationContext,
  InterfaceMethodDeclarationContext,
  ConstructorDeclarationContext,
  FieldDeclarationContext,
  PropertyDeclarationContext,
  FormalParametersContext,
  TypeRefContext,
  ModifierContext,
  AnnotationContext,
  TriggerUnitContext,
  TriggerMemberDeclarationContext,
  EnumDeclarationContext,
  EnumConstantsContext,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { Stack } from 'data-structure-typed';
import { ApexReferenceCollectorListener } from './ApexReferenceCollectorListener';

import {
  LayeredSymbolListenerBase,
  DetailLevel,
} from './LayeredSymbolListenerBase';
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
import { isBlockSymbol, isEnumSymbol } from '../../utils/symbolNarrowing';
import {
  ClassModifierValidator,
  MethodModifierValidator,
} from '../../semantics/modifiers/index';
import { ErrorReporter } from '../../utils/ErrorReporter';

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
export class VisibilitySymbolListener
  extends LayeredSymbolListenerBase
  implements ErrorReporter
{
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
        "VisibilitySymbolListener only supports 'public-api', 'protected', " +
          `or 'private' detail levels. Got: ${detailLevel}`,
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
      // Only create TypeSymbol for public-api level and matching visibility
      if (
        this.detailLevel === 'public-api' &&
        this.shouldProcessSymbol(modifiers.visibility)
      ) {
        // Validate identifier
        const validationResult = IdentifierValidator.validateIdentifier(
          name,
          SymbolKind.Class,
          this.scopeStack.isEmpty(), // isTopLevel
          this.createValidationScope(),
        );

        if (!validationResult.isValid) {
          validationResult.errors.forEach((error) => {
            const errorMessage =
              typeof error === 'string' ? error : error.message;
            this.addError(errorMessage, ctx);
          });
        }

        // Validate class modifiers using ClassModifierValidator
        const currentType = this.getCurrentType();
        ClassModifierValidator.validateClassVisibilityModifiers(
          name,
          modifiers,
          ctx,
          !!currentType, // isInnerClass
          currentType,
          this.currentAnnotations,
          this,
        );

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
        this.addSymbolWithDetailLevel(
          classSymbol,
          this.getCurrentScopeSymbol(ctx),
        );
      }

      // Create class block symbol for scope tracking (all levels need this - do NOT skip based on visibility)
      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(ctx),
        name,
        ctx,
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

      // Only create TypeSymbol for public-api level and matching visibility
      if (
        this.detailLevel === 'public-api' &&
        this.shouldProcessSymbol(modifiers.visibility)
      ) {
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
          this.getCurrentScopeSymbol(ctx),
        );
      }

      // Create interface block symbol for scope tracking (all levels need this - do NOT skip based on visibility)
      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(ctx),
        name,
        ctx,
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
   * Called when entering an enum declaration
   * Only creates TypeSymbol if detailLevel is 'public-api'
   * Otherwise, only tracks scope for symbol enrichment
   */
  enterEnumDeclaration(ctx: EnumDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownEnum';
      const modifiers = this.getCurrentModifiers();

      // Only create TypeSymbol for public-api level and matching visibility
      if (
        this.detailLevel === 'public-api' &&
        this.shouldProcessSymbol(modifiers.visibility)
      ) {
        const enumSymbol = this.createTypeSymbol(
          ctx,
          name,
          SymbolKind.Enum,
          modifiers,
        ) as EnumSymbol;

        // Initialize enum values array
        enumSymbol.values = [];

        if (this.currentAnnotations.length > 0) {
          enumSymbol.annotations = [...this.currentAnnotations];
        }

        const isTopLevel = this.scopeStack.isEmpty();
        if (isTopLevel) {
          enumSymbol.parentId = null;
        }
        this.addSymbolWithDetailLevel(
          enumSymbol,
          this.getCurrentScopeSymbol(ctx),
        );
      }

      // Create enum block symbol for scope tracking (all levels need this - do NOT skip based on visibility)
      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(ctx),
        name,
        ctx,
      );

      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum declaration: ${errorMessage}`, ctx);
    }
  }

  exitEnumDeclaration(): void {
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped) && popped.scopeType !== 'class') {
      this.logger.warn(
        `Expected class scope on exitEnumDeclaration, but got ${popped.scopeType}`,
      );
    }
  }

  /**
   * Called when entering enum constants
   * Collects enum values and adds them to the enum symbol
   */
  enterEnumConstants(ctx: EnumConstantsContext): void {
    try {
      const currentType = this.getCurrentType();
      if (!isEnumSymbol(currentType)) {
        this.addError('Enum constants found outside of enum declaration', ctx);
        return;
      }

      const enumType = createTypeInfo(currentType?.name ?? 'Object');
      const enumSymbol = currentType;

      // Ensure values array exists
      if (!enumSymbol.values) {
        enumSymbol.values = [];
      }

      for (const id of ctx.id()) {
        const name = id.text;
        const modifiers = this.getCurrentModifiers();

        // Create enum value symbol using createVariableSymbol method
        const valueSymbol = this.createVariableSymbol(
          id,
          modifiers,
          name,
          SymbolKind.EnumValue,
          enumType,
        ) as VariableSymbol;

        // Set the kind explicitly to EnumValue
        valueSymbol.kind = SymbolKind.EnumValue;

        // Add to enum symbol's values array
        enumSymbol.values.push(valueSymbol);

        // Add to symbol table with the enum block as parent
        this.addSymbolWithDetailLevel(
          valueSymbol,
          this.getCurrentScopeSymbol(),
        );
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum constants: ${errorMessage}`, ctx);
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

      // Validate method modifiers using MethodModifierValidator
      const currentType = this.getCurrentType();
      MethodModifierValidator.validateMethodModifiers(
        name,
        modifiers,
        ctx,
        currentType,
        this,
      );

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
    // Only pop if we actually pushed a method block in enterMethodDeclaration
    // This happens only for private level AND when the method visibility matched
    if (this.detailLevel === 'private') {
      const currentScope = this.scopeStack.peek();
      // Only pop if the current scope is a method block
      // (avoid popping class block if method was skipped due to visibility mismatch)
      if (isBlockSymbol(currentScope) && currentScope.scopeType === 'method') {
        this.scopeStack.pop();
      }
    }
  }

  /**
   * Called when entering an interface method declaration
   * Interface methods are always public and abstract
   */
  enterInterfaceMethodDeclaration(
    ctx: InterfaceMethodDeclarationContext,
  ): void {
    try {
      const name = ctx.id()?.text ?? 'unknownMethod';

      // Interface methods are implicitly public and abstract
      // Always process them regardless of detail level (they're part of the interface contract)
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
        isBuiltIn: false,
      };

      const returnType = this.getReturnType(ctx);
      const parameters = this.extractParameters(ctx.formalParameters());

      const methodSymbol = this.createMethodSymbol(
        ctx,
        name,
        implicitModifiers,
        returnType,
      );

      methodSymbol.parameters = parameters;

      if (this.currentAnnotations.length > 0) {
        methodSymbol.annotations = [...this.currentAnnotations];
      }

      // Always add interface methods (they're part of the public API)
      this.addSymbolWithDetailLevel(methodSymbol, this.getCurrentScopeSymbol());

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
      this.addError(
        `Error in interface method declaration: ${errorMessage}`,
        ctx,
      );
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

      // Validate that constructor name is not a dotted name (semantic error)
      if (ids && ids.length > 1) {
        const qualifiedNameError =
          'Invalid constructor declaration: Constructor names cannot use qualified names. Found: ' +
          this.getTextFromContext(qualifiedName);
        this.addError(qualifiedNameError, ctx);
        return;
      }

      const currentType = this.getCurrentType(ctx);
      const name =
        ids && ids.length > 0
          ? ids[0].text
          : (currentType?.name ?? 'unknownConstructor');

      // Validate that constructor name matches the enclosing class name
      if (currentType && name !== currentType.name) {
        const errorMessage =
          "Invalid constructor declaration: Constructor name '" +
          name +
          "' must match the enclosing class name '" +
          currentType.name +
          "'";
        this.addError(errorMessage, ctx);
        return;
      }

      const modifiers = this.getCurrentModifiers();

      // Only process constructors matching this listener's visibility
      if (!this.shouldProcessSymbol(modifiers.visibility)) {
        return;
      }

      const parameters = this.extractParameters(ctx.formalParameters());

      // CRITICAL: Find the correct class block
      // The constructor name matches the class name - use that to find the correct type and block
      // This ensures we get the correct block for inner classes
      // Strategy: Always look up by constructor name first, then verify/fallback to scope stack
      let classBlock: ScopeSymbol | undefined = undefined;

      if (name) {
        // Find the type with the constructor's name (most nested one if multiple)
        const matchingTypes = this.symbolTable
          .getAllSymbols()
          .filter(
            (s) =>
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface ||
                s.kind === SymbolKind.Enum ||
                s.kind === SymbolKind.Trigger) &&
              s.name === name &&
              s.fileUri === this.currentFilePath,
          ) as TypeSymbol[];

        if (matchingTypes.length > 0) {
          // Prefer nested types (inner classes) - they're more specific
          // If multiple types with same name, prefer the one that's nested (has parentId)
          // This ensures inner classes are selected over outer classes with the same name
          const targetType = matchingTypes.reduce((mostNested, current) => {
            const currentIsNested = current.parentId !== null;
            const mostNestedIsNested = mostNested.parentId !== null;
            if (currentIsNested && !mostNestedIsNested) return current;
            if (!currentIsNested && mostNestedIsNested) return mostNested;
            // If both nested or both top-level, prefer the one that appears later in the array
            // (which should be more nested due to parse order)
            return current;
          });

          // Find the block for this type
          classBlock = this.symbolTable
            .getAllSymbols()
            .find(
              (s) =>
                isBlockSymbol(s) &&
                s.scopeType === 'class' &&
                s.parentId === targetType.id,
            ) as ScopeSymbol | undefined;
        }
      }

      // Fallback: if lookup by name didn't work, try scope stack or currentType
      if (!classBlock) {
        classBlock = this.getCurrentScopeSymbol() || undefined;

        // Verify the block belongs to currentType if we have both
        if (classBlock && currentType) {
          const blockType = this.symbolTable
            .getAllSymbols()
            .find(
              (s) =>
                s.id === classBlock!.parentId &&
                (s.kind === SymbolKind.Class ||
                  s.kind === SymbolKind.Interface ||
                  s.kind === SymbolKind.Enum ||
                  s.kind === SymbolKind.Trigger),
            ) as TypeSymbol | undefined;

          if (!blockType || blockType.id !== currentType.id) {
            // Wrong block - look up by currentType
            classBlock = this.symbolTable
              .getAllSymbols()
              .find(
                (s) =>
                  isBlockSymbol(s) &&
                  s.scopeType === 'class' &&
                  s.parentId === currentType.id,
              ) as ScopeSymbol | undefined;
          }
        } else if (!classBlock && currentType) {
          // No block from scope stack - look up by currentType
          classBlock = this.symbolTable
            .getAllSymbols()
            .find(
              (s) =>
                isBlockSymbol(s) &&
                s.scopeType === 'class' &&
                s.parentId === currentType.id,
            ) as ScopeSymbol | undefined;
        }
      }

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

      // CRITICAL: Ensure constructor's parentId points to the class block (for uniform FQN hierarchy)
      // Match the pattern from ApexSymbolCollectorListener - same for outer and inner classes
      if (classBlock && classBlock.scopeType === 'class') {
        constructorSymbol.parentId = classBlock.id;
      } else if (currentType) {
        // Fallback: if we couldn't find the block, use the type ID
        // This should only happen in edge cases - normally the block should be found
        constructorSymbol.parentId = currentType.id;
        this.logger.warn(
          () =>
            `Could not find class block for constructor '${name}' in type ` +
            `'${currentType.name}', using type ID as parentId`,
        );
      }

      this.addSymbolWithDetailLevel(constructorSymbol, classBlock || null);

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
    // Only pop if we actually pushed a method block in enterConstructorDeclaration
    // This happens only for private level AND when the constructor visibility matched
    if (this.detailLevel === 'private') {
      const currentScope = this.scopeStack.peek();
      // Only pop if the current scope is a method block
      // (avoid popping class block if constructor was skipped due to visibility mismatch)
      if (isBlockSymbol(currentScope) && currentScope.scopeType === 'method') {
        this.scopeStack.pop();
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

      // Triggers don't have visibility modifiers - they're always public
      // Only create TypeSymbol for public-api level (always process triggers)
      if (this.detailLevel === 'public-api') {
        // Create trigger symbol (parentId is already set to null in createTypeSymbol)
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

      // Create trigger block symbol for scope tracking (all levels need this - do NOT skip based on visibility)
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

      // Only create TypeSymbol for public-api level and matching visibility
      if (
        this.detailLevel === 'public-api' &&
        this.shouldProcessSymbol(modifiers.visibility)
      ) {
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
          this.getCurrentScopeSymbol(ctx),
        );
      }

      // Create trigger block symbol for scope tracking (all levels need this)
      const location = this.getLocation(ctx);
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        this.getCurrentScopeSymbol(ctx),
        name, // Pass the trigger name so createBlockSymbol can find the trigger symbol
        ctx,
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

  /**
   * Find the root symbol (class/interface/enum/trigger) for a given scope
   * Traverses up the parentId chain to find the top-level type
   * @param startingScope The scope to start from (can be null for file level)
   * @returns The root type symbol, or null if not found
   */
  private findRootSymbol(startingScope: ScopeSymbol | null): ApexSymbol | null {
    if (!startingScope) {
      // At file level, find the most recent root symbol
      const roots = this.symbolTable.getRoots();
      // Return the most recently added root (last in array)
      return roots.length > 0 ? roots[roots.length - 1] : null;
    }

    // Traverse up the parentId chain to find the root
    let current: ApexSymbol | null = startingScope;
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);

      // If this symbol is a root (parentId === null) and is a type, return it
      if (
        current.parentId === null &&
        (current.kind === SymbolKind.Class ||
          current.kind === SymbolKind.Interface ||
          current.kind === SymbolKind.Enum ||
          current.kind === SymbolKind.Trigger)
      ) {
        return current;
      }

      // Move to parent
      if (current.parentId) {
        const allSymbols = this.symbolTable.getAllSymbols();
        current = allSymbols.find((s) => s.id === current!.parentId) || null;
      } else {
        current = null;
      }
    }

    // Fallback: if we didn't find a root by traversing, check roots array
    const roots = this.symbolTable.getRoots();
    return roots.length > 0 ? roots[roots.length - 1] : null;
  }

  private getCurrentScopeSymbol(ctx?: ParserRuleContext): ScopeSymbol | null {
    // First try scope stack (fast path)
    const peeked = this.scopeStack.peek();
    if (isBlockSymbol(peeked)) {
      return peeked;
    }

    // Fallback: Use parse tree + symbol table when scope stack is empty
    if (ctx && this.scopeStack.isEmpty()) {
      const currentType = this.getCurrentTypeFromParseTree(ctx);
      if (currentType) {
        // Find the block for this type - use getAllSymbols() since we need to filter by parentId
        const allSymbols = this.symbolTable.getAllSymbols();
        const block = allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.parentId === currentType.id &&
            s.fileUri === this.currentFilePath,
        ) as ScopeSymbol | undefined;

        return block || null;
      }
    }

    return null;
  }

  private getCurrentType(ctx?: ParserRuleContext): TypeSymbol | null {
    // First try scope stack (fast path for public-api walk)
    const stackArray = this.scopeStack.toArray();
    for (let i = stackArray.length - 1; i >= 0; i--) {
      const owner = stackArray[i];
      if (isBlockSymbol(owner) && owner.scopeType === 'class') {
        // Use getSymbolById for O(1) lookup instead of getAllSymbols().find()
        if (owner.parentId) {
          const typeSymbol = this.symbolTable.getSymbolById(owner.parentId);
          if (
            typeSymbol &&
            (typeSymbol.kind === SymbolKind.Class ||
              typeSymbol.kind === SymbolKind.Interface ||
              typeSymbol.kind === SymbolKind.Enum ||
              typeSymbol.kind === SymbolKind.Trigger)
          ) {
            return typeSymbol as TypeSymbol;
          }
        }
      }
    }

    // Fallback: Use parse tree traversal when scope stack is empty
    if (ctx && this.scopeStack.isEmpty()) {
      return this.getCurrentTypeFromParseTree(ctx);
    }

    return null;
  }

  /**
   * Get current type from parse tree structure when scope stack is empty.
   * For class/interface/enum declarations, returns the type being declared.
   * For other contexts, traverses up to find containing type declarations.
   */
  private getCurrentTypeFromParseTree(
    ctx: ParserRuleContext,
  ): TypeSymbol | null {
    // Check if ctx itself is a type declaration context
    const contextName = ctx.constructor.name;
    if (
      contextName === 'ClassDeclarationContext' ||
      contextName === 'InterfaceDeclarationContext' ||
      contextName === 'EnumDeclarationContext'
    ) {
      const typeId = (ctx as any).id?.();
      const typeName = typeId?.text;

      if (typeName) {
        // Find the type symbol - prefer most nested if multiple matches
        const allSymbols = this.symbolTable.getAllSymbols();
        const matchingTypes = allSymbols.filter(
          (s) =>
            s.name === typeName &&
            s.fileUri === this.currentFilePath &&
            (s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum ||
              s.kind === SymbolKind.Trigger),
        ) as TypeSymbol[];

        if (matchingTypes.length > 0) {
          // Return the most nested matching type (for inner classes)
          return matchingTypes.reduce((mostNested, current) => {
            const currentIsNested = current.parentId !== null;
            const mostNestedIsNested = mostNested.parentId !== null;
            if (currentIsNested && !mostNestedIsNested) return current;
            if (!currentIsNested && mostNestedIsNested) return mostNested;
            return current;
          });
        }
      }
    }

    // Otherwise, traverse up parse tree to find containing type declarations
    let current: ParserRuleContext | undefined = ctx.parent;
    while (current) {
      const parentContextName = current.constructor.name;

      if (
        parentContextName === 'ClassDeclarationContext' ||
        parentContextName === 'InterfaceDeclarationContext' ||
        parentContextName === 'EnumDeclarationContext'
      ) {
        const typeId = (current as any).id?.();
        const typeName = typeId?.text;

        if (typeName) {
          // Find the type symbol - prefer most nested if multiple matches
          const allSymbols = this.symbolTable.getAllSymbols();
          const matchingTypes = allSymbols.filter(
            (s) =>
              s.name === typeName &&
              s.fileUri === this.currentFilePath &&
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface ||
                s.kind === SymbolKind.Enum ||
                s.kind === SymbolKind.Trigger),
          ) as TypeSymbol[];

          if (matchingTypes.length > 0) {
            // Return the most nested matching type (for inner classes)
            return matchingTypes.reduce((mostNested, current) => {
              const currentIsNested = current.parentId !== null;
              const mostNestedIsNested = mostNested.parentId !== null;
              if (currentIsNested && !mostNestedIsNested) return current;
              if (!currentIsNested && mostNestedIsNested) return mostNested;
              return current;
            });
          }
        }
      }

      current = current.parent;
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

    // For triggers, always set parentId to null (they're always top-level)
    // For other types, use parent?.id || null
    const parentId = kind === SymbolKind.Trigger ? null : parent?.id || null;

    const typeSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      kind,
      location,
      this.currentFilePath,
      modifiers,
      parentId,
      undefined,
      namespace,
      this.getCurrentAnnotations(),
      scopePath,
    ) as TypeSymbol;

    return typeSymbol;
  }

  private createMethodSymbol(
    ctx: MethodDeclarationContext | InterfaceMethodDeclarationContext,
    name: string,
    modifiers: SymbolModifiers,
    returnType: TypeInfo,
  ): MethodSymbol {
    const location = this.getLocation(ctx);
    const parent = this.getCurrentType();
    const namespace = parent?.namespace || null;

    // Get the current scope (should be a class block)
    // Methods should have parentId = class block ID to match ApexSymbolCollectorListener
    let currentScope = this.getCurrentScopeSymbol();

    // If scope stack is empty (subsequent listener walks), look up the class block from symbol table
    if (!currentScope && parent) {
      const classBlock = this.symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.parentId === parent.id,
        ) as ScopeSymbol | undefined;
      if (classBlock) {
        currentScope = classBlock;
      }
    }

    const parentId =
      currentScope && currentScope.scopeType === 'class'
        ? currentScope.id
        : parent?.id || null;

    // Get current scope path for unique symbol ID
    // Include root symbol's prefix and name in scopePath to match ApexSymbolCollectorListener format
    // This ensures methods created by different listeners have the same unifiedId
    const baseScopePath = this.symbolTable.getCurrentScopePath(currentScope);
    const rootSymbol = this.findRootSymbol(currentScope);
    let scopePath: string[] = baseScopePath;
    if (rootSymbol) {
      // Include the root symbol's prefix (kind) and name to match the class ID format
      // e.g., ['class', 'MyClass', 'block1'] instead of ['MyClass', 'block1']
      const rootPrefix = rootSymbol.kind; // e.g., 'class', 'interface', 'enum', 'trigger'
      scopePath = [rootPrefix, rootSymbol.name, ...baseScopePath];
    }

    const methodSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      SymbolKind.Method,
      location,
      this.currentFilePath,
      modifiers,
      parentId,
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

    // Don't set parentId here - it will be set explicitly in enterConstructorDeclaration
    // This ensures we always use the correct class block, even when scope stack is empty
    const parentId = null; // Will be set explicitly after finding the correct block

    // Get scope path for ID generation (use current scope if available)
    const currentScope = this.getCurrentScopeSymbol();
    const scopePath = this.symbolTable.getCurrentScopePath(currentScope);

    const constructorSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      SymbolKind.Constructor,
      location,
      this.currentFilePath,
      modifiers,
      parentId,
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
    kind: SymbolKind.Field | SymbolKind.Property | SymbolKind.EnumValue,
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
    ctx?: ParserRuleContext,
  ): ScopeSymbol | null {
    const fileUri = this.symbolTable.getFileUri();

    // Find semantic symbol and determine parentId
    let currentType = this.getCurrentType(ctx);
    let parentId: string | null = null;

    // For class blocks, if we have a semanticName, check if getCurrentType() returned
    // the correct type (matching semanticName). If not, or if getCurrentType() returned null,
    // look up the type symbol by name (this handles inner classes where getCurrentType()
    // might return the containing outer class instead of the inner class)
    // For inner classes, prefer the most nested type with matching name
    if (
      scopeType === 'class' &&
      semanticName &&
      (!currentType || currentType.name !== semanticName)
    ) {
      const allSymbols = this.symbolTable.getAllSymbols();
      const matchingTypes = allSymbols.filter(
        (s) =>
          s.name === semanticName &&
          s.fileUri === fileUri &&
          (s.kind === SymbolKind.Class ||
            s.kind === SymbolKind.Interface ||
            s.kind === SymbolKind.Enum ||
            s.kind === SymbolKind.Trigger),
      ) as TypeSymbol[];

      if (matchingTypes.length > 0) {
        // Prefer the most nested type (one with parentId, and deepest nesting)
        // This ensures inner classes are correctly identified even when scope stack is empty
        // For inner classes, we need to find the type that matches the current parse context
        // Since we don't have scope stack info, we'll prefer nested types and use parse order
        currentType = matchingTypes.reduce((mostNested, current) => {
          const currentIsNested = current.parentId !== null;
          const mostNestedIsNested = mostNested.parentId !== null;

          // Prefer nested over top-level
          if (currentIsNested && !mostNestedIsNested) return current;
          if (!currentIsNested && mostNestedIsNested) return mostNested;

          // If both nested, prefer the one that appears later in the array
          // (which should be more deeply nested due to parse order)
          // If both top-level, prefer the one that appears later (shouldn't happen for same name)
          return current;
        });

        // Debug: Log if we found multiple types (shouldn't happen in normal cases)
        if (matchingTypes.length > 1 && currentType) {
          const selectedType = currentType; // Capture for closure
          this.logger.debug(
            () =>
              `Found ${matchingTypes.length} types with name '${semanticName}', ` +
              `selected: ${selectedType.name} (parentId: ${selectedType.parentId})`,
          );
        }
      }
    }

    if (currentType && scopeType === 'class') {
      parentId = currentType.id;
    } else if (parentScope) {
      parentId = parentScope.id;
    }

    // Check if block symbol already exists (from a previous listener walk)
    // Look it up by finding a block with matching scopeType and parentId
    // This must happen BEFORE calculating scope path to reuse existing block's key
    if (scopeType === 'class' && parentId) {
      const existingBlock = this.symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === scopeType &&
            s.parentId === parentId &&
            s.fileUri === fileUri,
        ) as ScopeSymbol | undefined;
      if (existingBlock) {
        // Block already exists, return it instead of creating a duplicate
        // This ensures we reuse the same block instance across listener walks
        return existingBlock;
      }
    }

    // Calculate scope path correctly even when parentScope is null
    // For class blocks, always build the path from the type symbol's hierarchy
    // This ensures consistent keys across multiple listener walks
    let scopePath: string[];
    if (scopeType === 'class' && currentType) {
      // Build scope path by traversing the type symbol's parentId chain
      // This ensures we get the same path regardless of which listener is walking
      const path: string[] = [];
      let type: ApexSymbol | undefined = currentType;

      // Traverse up the parentId chain to find all containing types
      while (type && type.parentId) {
        // Use getSymbolById for O(1) lookup instead of getAllSymbols().find()
        const parentSymbol = this.symbolTable.getSymbolById(type.parentId);

        if (
          parentSymbol &&
          isBlockSymbol(parentSymbol) &&
          parentSymbol.scopeType === 'class'
        ) {
          // Parent is a class block - add it to the path
          path.unshift('block', parentSymbol.name);
          // Find the type symbol this block belongs to - use getSymbolById for O(1) lookup
          if (parentSymbol.parentId) {
            const parentType = this.symbolTable.getSymbolById(
              parentSymbol.parentId,
            );
            if (
              parentType &&
              (parentType.kind === SymbolKind.Class ||
                parentType.kind === SymbolKind.Interface ||
                parentType.kind === SymbolKind.Enum ||
                parentType.kind === SymbolKind.Trigger)
            ) {
              type = parentType as TypeSymbol;
            } else {
              break;
            }
          } else {
            break;
          }
        } else if (
          parentSymbol &&
          (parentSymbol.kind === SymbolKind.Class ||
            parentSymbol.kind === SymbolKind.Interface ||
            parentSymbol.kind === SymbolKind.Enum ||
            parentSymbol.kind === SymbolKind.Trigger)
        ) {
          // Parent is a type symbol (inner class case) - find its block and continue
          // Note: This lookup filters by parentId, so we can't use getSymbolById directly
          // but this is only executed for inner classes (rare case)
          const parentBlock = this.symbolTable
            .getAllSymbols()
            .find(
              (s) =>
                isBlockSymbol(s) &&
                s.scopeType === 'class' &&
                s.parentId === parentSymbol.id,
            ) as ScopeSymbol | undefined;
          if (parentBlock) {
            path.unshift('block', parentBlock.name);
          }
          type = parentSymbol;
        } else {
          break;
        }
      }
      scopePath = path;
    } else {
      // Use the standard scope path calculation for non-class blocks
      scopePath = this.symbolTable.getCurrentScopePath(parentScope);
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
   * Extract text from a parser context
   */
  private getTextFromContext(ctx: ParserRuleContext | any): string {
    if (!ctx) return '';
    return ctx.text || '';
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

  private getReturnType(
    ctx: MethodDeclarationContext | InterfaceMethodDeclarationContext,
  ): TypeInfo {
    const typeRef = (ctx as any).typeRef?.();
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
   * Implement ErrorReporter interface - make addError/addWarning public
   */
  public addError(
    message: string,
    context:
      | ParserRuleContext
      | { line: number; column: number; endLine?: number; endColumn?: number },
  ): void {
    super.addError(message, context);
  }

  public addWarning(message: string, context?: ParserRuleContext): void {
    super.addWarning(message, context);
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
