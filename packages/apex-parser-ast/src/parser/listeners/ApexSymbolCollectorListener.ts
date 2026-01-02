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
  VariableDeclaratorsContext,
  InterfaceDeclarationContext,
  ConstructorDeclarationContext,
  InterfaceMethodDeclarationContext,
  FormalParameterContext,
  FormalParametersContext,
  EnumDeclarationContext,
  BlockContext,
  ModifierContext,
  AnnotationContext,
  EnumConstantsContext,
  TriggerMemberDeclarationContext,
  TriggerUnitContext,
  PropertyDeclarationContext,
  // Add specific contexts for type reference capture
  MethodCallExpressionContext,
  NewExpressionContext,
  DotExpressionContext,
  TypeRefContext,
  // Add missing contexts for complete reference capture
  IdPrimaryContext,
  ThisPrimaryContext,
  SuperPrimaryContext,
  PrimaryExpressionContext,
  AssignExpressionContext,
  ArrayExpressionContext,
  CastExpressionContext,
  // Use dedicated method call contexts for precise capture
  MethodCallContext,
  DotMethodCallContext,
  EnhancedForControlContext,
  TypeRefPrimaryContext,
  QualifiedNameContext,
  AnyIdContext,
  // Add contexts for type checking
  TypeListContext,
  TypeNameContext,
  InstanceOfExpressionContext,
  ExpressionListContext,
  TypeArgumentsContext,
  ParExpressionContext,
  ArgumentsContext,
  ArrayInitializerContext,
  LiteralContext,
  // Add contexts for control structures
  IfStatementContext,
  WhileStatementContext,
  ForStatementContext,
  ForControlContext,
  ForUpdateContext,
  TryStatementContext,
  CatchClauseContext,
  FinallyBlockContext,
  SwitchStatementContext,
  WhenControlContext,
  DoWhileStatementContext,
  RunAsStatementContext,
  GetterContext,
  SetterContext,
  LocalVariableDeclarationContext,
  // Add contexts for keyword detection
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Stack } from 'data-structure-typed';

import { BaseApexParserListener } from './BaseApexParserListener';
import { Namespaces, Namespace } from '../../namespace/NamespaceUtils';
import { TypeInfo, createPrimitiveType } from '../../types/typeInfo';
import {
  createTypeInfo,
  createCollectionTypeInfo,
  createMapTypeInfo,
} from '../../utils/TypeInfoFactory';
import {
  SymbolReferenceFactory,
  ReferenceContext,
  EnhancedSymbolReference,
} from '../../types/symbolReference';
import type { SymbolReference } from '../../types/symbolReference';
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
  SymbolFactory,
  ApexSymbol,
  ScopeSymbol,
  Range,
  ScopeType,
  SymbolKey,
} from '../../types/symbol';
import {
  ClassModifierValidator,
  FieldModifierValidator,
  PropertyModifierValidator,
  InterfaceBodyValidator,
  ErrorReporter,
} from '../../semantics/modifiers/index';
import { IdentifierValidator } from '../../semantics/validation/IdentifierValidator';
import {
  hasIdMethod,
  isEnumSymbol,
  isConstructorSymbol,
  isMethodSymbol,
  isClassSymbol,
  isInterfaceSymbol,
  isBlockSymbol,
  isChainedSymbolReference,
} from '../../utils/symbolNarrowing';
import {
  isContextType,
  isMethodRelatedContext,
  isFieldOrPropertyContext,
  isTypeDeclarationContext,
  isDotExpressionContext,
  isTypeReferenceContext,
  isVariableOrFieldDeclarationContext,
  isMethodDeclarationContext,
  isMethodCallContext,
} from '../../utils/contextTypeGuards';
import { ResourceLoader } from '../../utils/resourceLoader';
import { DEFAULT_SALESFORCE_API_VERSION } from '../../constants/constants';
import { HierarchicalReferenceResolver } from '../../types/hierarchicalReference';
import { ApexReferenceResolver } from '../references/ApexReferenceResolver';

interface SemanticError {
  type: 'semantic';
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  fileUri: string;
}

interface ChainScope {
  isActive: boolean;
  baseExpression: string;
  chainNodes: SymbolReference[];
  startLocation: SymbolLocation;
  depth: number;
  parentScope?: ChainScope;
}

/**
 * A listener that collects symbols from Apex code and organizes them into symbol tables.
 * This listener builds a hierarchy of symbol scopes and tracks symbols defined in each scope.
 *
 * @deprecated Use {@link FullSymbolCollectorListener} instead, which uses layered listeners
 * for better performance and progressive enhancement capabilities. For services that only
 * need public API symbols (e.g., document open, diagnostics), use {@link PublicAPISymbolListener}
 * directly for improved performance.
 *
 * Migration guide:
 * - For full symbol collection: Replace `new ApexSymbolCollectorListener()` with `new FullSymbolCollectorListener()`
 * - For public API only: Replace with `new PublicAPISymbolListener()`
 * - Ensure `collectReferences: true` and `resolveReferences: true` are set in CompilationOptions
 */
export class ApexSymbolCollectorListener
  extends BaseApexParserListener<SymbolTable>
  implements ErrorReporter
{
  private readonly logger;
  private symbolTable: SymbolTable;
  private scopeStack: Stack<ApexSymbol> = new Stack<ApexSymbol>();
  private currentNamespace: Namespace | null = null; // NEW: Track current namespace
  protected projectNamespace: string | undefined = undefined; // NEW: Store project namespace
  private blockCounter: number = 0; // Counter for unique block names
  private currentModifiers: SymbolModifiers = this.createDefaultModifiers();
  private currentAnnotations: Annotation[] = [];
  private currentFilePath: string = '';
  private semanticErrors: SemanticError[] = [];
  private semanticWarnings: SemanticError[] = [];
  // Assignment LHS suppression state to avoid duplicate captures from child listeners
  private suppressAssignmentLHS: boolean = false;
  private suppressedLHSRange: SymbolLocation | null = null;

  // Stack-based method/constructor call tracking (separate from scopeStack)
  // Tracks the current method/constructor call being processed and its parameters
  // This stack operates independently from scopeStack:
  // - scopeStack: Tracks lexical scopes (class, method, block) for symbol resolution
  // - methodCallStack: Tracks method/constructor call hierarchy for parameter tracking
  // The stacks track different concerns and can be active simultaneously
  private methodCallStack: Stack<{
    callRef: SymbolReference; // METHOD_CALL or CONSTRUCTOR_CALL
    parameterRefs: SymbolReference[];
  }> = new Stack();

  private hierarchicalResolver = new HierarchicalReferenceResolver();
  private readonly referenceResolver = new ApexReferenceResolver();

  private enableReferenceCorrection: boolean = true; // Default to enabled

  // WeakMap to store TYPE_DECLARATION SymbolReference objects by localVariableDeclaration context
  // When enterTypeRef is called from within a localVariableDeclaration, we store the reference
  // keyed by the parent localVariableDeclaration context. Then when processLocalVariableDeclaration
  // processes the variable, we can retrieve the reference using the same context object.
  private localVarDeclToTypeRefMap = new WeakMap<
    ParserRuleContext,
    SymbolReference
  >();

  /**
   * Creates a new instance of the ApexSymbolCollectorListener.
   * @param symbolTable Optional existing symbol table to use. If not provided, a new one will be created.
   */
  constructor(symbolTable?: SymbolTable) {
    super();
    this.logger = getLogger();
    this.symbolTable = symbolTable || new SymbolTable();
    // Note: SymbolTable constructor already creates a 'file' scope as root
    // No need to call enterScope('file') again
  }

  /**
   * Set the project namespace for this compilation
   */
  setProjectNamespace(namespace: string): void {
    this.projectNamespace = namespace;
    this.currentNamespace = namespace ? Namespaces.create(namespace) : null;
    this.logger.debug(() => `Set project namespace to: ${namespace}`);
  }

  /**
   * Set the current file path for this compilation
   */
  setCurrentFileUri(fileUri: string): void {
    this.currentFilePath = fileUri;
    this.symbolTable.setFileUri(fileUri);
    this.logger.debug(() => `Set current file path to: ${fileUri}`);
  }

  /**
   * Set whether to enable second-pass reference context correction
   * @param enabled Whether to enable reference correction (defaults to true)
   */
  setEnableReferenceCorrection(enabled: boolean): void {
    this.enableReferenceCorrection = enabled;
    this.logger.debug(
      () => `Reference correction ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Get the collected symbol table
   */
  getResult(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Get the current scope symbol without removing it
   * @returns The current scope symbol (ScopeSymbol), or null if stack is empty
   */
  private getCurrentScope(): ApexSymbol | null {
    return this.scopeStack.peek() ?? null;
  }

  /**
   * Get the current scope as a ScopeSymbol using type guard
   * @returns The current scope symbol as ScopeSymbol, or null if stack is empty or not a block symbol
   */
  private getCurrentScopeSymbol(): ScopeSymbol | null {
    const peeked = this.scopeStack.peek();
    return isBlockSymbol(peeked) ? peeked : null;
  }

  /**
   * Get the current type symbol from the stack
   * @returns The current type symbol, or null if not in a type scope
   * Returns the innermost (most recent) type when nested classes are present
   */
  private getCurrentType(): TypeSymbol | null {
    // Iterate from the top of the stack (innermost scope) to find the most recent class
    const stackArray = this.scopeStack.toArray();
    // Reverse to iterate from top (innermost) to bottom (outermost)
    for (let i = stackArray.length - 1; i >= 0; i--) {
      const owner = stackArray[i];
      if (isBlockSymbol(owner)) {
        if (owner.scopeType === 'class') {
          // Block's parentId points to the class/interface/enum/trigger symbol
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
          if (typeSymbol) return typeSymbol as TypeSymbol;
        }
      }
    }
    return null;
  }

  /**
   * Get the current method symbol from the stack
   * @returns The current method symbol, or null if not in a method scope
   */
  private getCurrentMethod(): MethodSymbol | null {
    const stackArray = this.scopeStack.toArray();
    for (const owner of stackArray) {
      if (isBlockSymbol(owner)) {
        if (owner.scopeType === 'method') {
          // Block's parentId points to the method/constructor symbol
          const methodSymbol = this.symbolTable
            .getAllSymbols()
            .find(
              (s) =>
                s.id === owner.parentId &&
                (s.kind === SymbolKind.Method ||
                  s.kind === SymbolKind.Constructor),
            );
          if (methodSymbol) return methodSymbol as MethodSymbol;
        }
      }
    }
    return null;
  }

  /**
   * Get the current block symbol from the stack
   * @returns The current block symbol, or null if not in a block scope
   */
  private getCurrentBlock(): ScopeSymbol | null {
    const owner = this.scopeStack.peek();
    return isBlockSymbol(owner) ? owner : null;
  }

  /**
   * Get the type's scope for duplicate detection
   * When checking for duplicates, the current scope should be the type's block scope
   * where methods are stored. Methods are added to the current scope (type's block scope)
   * before entering the method scope. After exiting the first method, we're back in
   * the type's block scope, so getCurrentScope() should return the correct scope.
   * @returns The type's block scope where methods are stored
   */
  private getTypeScope(): ScopeSymbol | null {
    // Use stack to get current scope - should be the type's block scope
    const currentScope = this.scopeStack.peek();
    return isBlockSymbol(currentScope) ? currentScope : null;
  }

  /**
   * Generate a consistent block name using the pattern: ${scopeType}_${counter}
   * @param scopeType The type of scope
   * @returns A unique block name
   */
  private generateBlockName(scopeType: ScopeType): string {
    this.blockCounter++;
    return `${scopeType}_${this.blockCounter}`;
  }

  /**
   * Map ANTLR parser context types to ScopeType
   * @param ctx The parser context
   * @returns The corresponding ScopeType, or null if not a scope-creating context
   */
  private getScopeTypeFromContext(ctx: ParserRuleContext): ScopeType | null {
    if (isContextType(ctx, IfStatementContext)) return 'if';
    if (isContextType(ctx, WhileStatementContext)) return 'while';
    if (isContextType(ctx, ForStatementContext)) return 'for';
    if (isContextType(ctx, DoWhileStatementContext)) return 'doWhile';
    if (isContextType(ctx, TryStatementContext)) return 'try';
    if (isContextType(ctx, CatchClauseContext)) return 'catch';
    if (isContextType(ctx, FinallyBlockContext)) return 'finally';
    if (isContextType(ctx, SwitchStatementContext)) return 'switch';
    if (isContextType(ctx, WhenControlContext)) return 'when';
    if (isContextType(ctx, RunAsStatementContext)) return 'runAs';
    if (isContextType(ctx, GetterContext)) return 'getter';
    if (isContextType(ctx, SetterContext)) return 'setter';
    if (isContextType(ctx, BlockContext)) return 'block';
    return null;
  }

  /**
   * Find the semantic symbol (class/method) that a block should reference
   * @param scopeType The type of block
   * @param searchName The name to search for
   * @param parentScope The parent scope
   * @returns Object with the found symbol and the parentId to use
   */
  private findSemanticSymbolForBlock(
    scopeType: ScopeType,
    searchName: string,
    parentScope: ScopeSymbol | null,
  ): { symbol?: ApexSymbol; parentId: string | null } {
    let parentId: string | null = parentScope ? parentScope.id : null;

    if (scopeType === 'class') {
      // For class blocks, find the class/interface/enum/trigger symbol
      const currentScopeId = parentScope ? parentScope.id : null;
      let semanticSymbol = this.symbolTable.findSymbolInScope(
        currentScopeId,
        searchName,
      );
      if (semanticSymbol) {
        // Verify it's the right kind
        if (
          !(
            semanticSymbol.kind === SymbolKind.Class ||
            semanticSymbol.kind === SymbolKind.Interface ||
            semanticSymbol.kind === SymbolKind.Enum ||
            semanticSymbol.kind === SymbolKind.Trigger
          )
        ) {
          semanticSymbol = undefined;
        }
      }

      // If not found in current scope, search all symbols
      if (!semanticSymbol) {
        const allSymbols = this.symbolTable.getAllSymbols();
        for (let i = allSymbols.length - 1; i >= 0; i--) {
          const s = allSymbols[i];
          if (
            s.name === searchName &&
            s.kind !== SymbolKind.Block &&
            (s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum ||
              s.kind === SymbolKind.Trigger)
          ) {
            semanticSymbol = s;
            break;
          }
        }
      }

      if (semanticSymbol) {
        parentId = semanticSymbol.id;
        return { symbol: semanticSymbol, parentId };
      }
    } else if (scopeType === 'method') {
      // For method blocks, find the method/constructor symbol
      const allSymbols = this.symbolTable.getAllSymbols();
      for (let i = allSymbols.length - 1; i >= 0; i--) {
        const s = allSymbols[i];
        if (
          s.name === searchName &&
          s.kind !== SymbolKind.Block &&
          (s.kind === SymbolKind.Method || s.kind === SymbolKind.Constructor)
        ) {
          return { symbol: s, parentId: s.id };
        }
      }
      // Fallback: if we can't find the method symbol, point to parent scope
      return { parentId };
    }

    return { parentId };
  }

  /**
   * Calculate scope path for method blocks
   * @param methodSymbol The method symbol
   * @param parentScope The parent scope
   * @returns The scope path array
   */
  private calculateMethodBlockScopePath(
    methodSymbol: ApexSymbol,
    parentScope: ScopeSymbol | null,
  ): string[] {
    // Extract method path from method symbol's ID
    // Method symbol ID format: fileUri:scopePath:prefix:name
    // e.g., 'file:///test/TestClass.cls:class:MyClass:block_1:method:myMethod'
    const methodIdStr = methodSymbol.id;
    const fileUriEnd = methodIdStr.indexOf(':', methodIdStr.indexOf('://') + 3);
    // Extract method path from method symbol's ID
    const methodPath = methodIdStr.substring(fileUriEnd + 1);
    // methodPath is now: 'class:MyClass:block_1:method:myMethod' (already uses colons)
    return [methodPath];
  }

  /**
   * Calculate scope path for class blocks
   * @param rootSymbol The root symbol (class/interface/enum/trigger)
   * @param basePath The base path from parent scope
   * @returns The scope path array
   */
  private calculateClassBlockScopePath(
    rootSymbol: ApexSymbol | null,
    basePath: string[],
  ): string[] {
    if (rootSymbol) {
      const rootPrefix = rootSymbol.kind; // e.g., 'class', 'interface', 'enum', 'trigger'
      return [rootPrefix, rootSymbol.name, ...basePath];
    }
    return basePath;
  }

  /**
   * Calculate the scope path for a block symbol
   * @param scopeType The type of block
   * @param parentScope The parent scope
   * @param semanticName Optional semantic symbol name to search for
   * @returns The scope path array
   */
  private calculateScopePath(
    scopeType: ScopeType,
    parentScope: ScopeSymbol | null,
    semanticName?: string,
  ): string[] {
    if (scopeType === 'method') {
      // Build scopePath by following parentId chain, including semantic symbols
      const blockPath = this.symbolTable.getCurrentScopePath(
        parentScope ?? null,
      );
      // Find the method symbol that this block will point to
      const searchName = semanticName || '';
      const allSymbols = this.symbolTable.getAllSymbols();
      let methodSymbol: ApexSymbol | undefined;
      for (let i = allSymbols.length - 1; i >= 0; i--) {
        const s = allSymbols[i];
        if (
          s.name === searchName &&
          s.kind !== SymbolKind.Block &&
          (s.kind === SymbolKind.Method || s.kind === SymbolKind.Constructor)
        ) {
          methodSymbol = s;
          break;
        }
      }
      if (methodSymbol) {
        return this.calculateMethodBlockScopePath(methodSymbol, parentScope);
      } else {
        // Prepend root symbol's prefix and name to block path
        const rootSymbol = this.findRootSymbol(parentScope);
        return this.calculateClassBlockScopePath(rootSymbol, blockPath);
      }
    } else {
      const basePath = this.symbolTable.getCurrentScopePath(
        parentScope ?? null,
      );
      const rootSymbol = this.findRootSymbol(parentScope);
      return this.calculateClassBlockScopePath(rootSymbol, basePath);
    }
  }

  /**
   * Generic method to enter a scope for control structures
   * @param scopeType The type of scope to enter
   * @param ctx The parser context
   * @param semanticName Optional semantic symbol name for class/method blocks
   */
  private enterScope(
    scopeType: ScopeType,
    ctx: ParserRuleContext,
    semanticName?: string,
  ): void {
    try {
      const name = this.generateBlockName(scopeType);
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockSymbol = this.createBlockSymbol(
        name,
        scopeType,
        location,
        parentScope,
        semanticName,
      );

      if (!blockSymbol) {
        this.addError('Failed to create block symbol', ctx);
        return;
      }
      this.scopeStack.push(blockSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in ${scopeType} statement: ${errorMessage}`, ctx);
    }
  }

  /**
   * Generic method to exit a scope with validation
   * @param expectedScopeType The expected scope type (for validation)
   */
  private exitScope(expectedScopeType: ScopeType): void {
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== expectedScopeType) {
        this.logger.warn(
          `Expected ${expectedScopeType} scope on exit, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Creates a new instance of this listener for processing multiple files.
   * @returns A new instance of ApexSymbolCollectorListener with a fresh symbol table.
   */
  createNewInstance(): BaseApexParserListener<SymbolTable> {
    const newTable = new SymbolTable();
    // Note: SymbolTable constructor already creates a 'file' scope as root
    // No need to call enterScope('file') again
    return new ApexSymbolCollectorListener(newTable);
  }

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

  /**
   * Create a block symbol directly and add it to the symbol table.
   * This replaces enterScope() to use stack-only scope tracking.
   * @param name The block name (e.g., "block_1" for generic blocks, or semantic name for class/method blocks)
   * @param scopeType The type of block
   * @param location The location of the block
   * @param parentScope The parent scope from the stack (null for file level)
   * @param semanticName Optional semantic symbol name to search for
   *                     (for class/method blocks, use the class/method name, not the block name)
   * @returns The created block symbol
   */
  private createBlockSymbol(
    name: string,
    scopeType: ScopeType,
    location: SymbolLocation,
    parentScope: ScopeSymbol | null,
    semanticName?: string,
  ): ScopeSymbol {
    const fileUri = this.symbolTable.getFileUri();

    // Calculate scope path using helper method
    const scopePath = this.calculateScopePath(
      scopeType,
      parentScope,
      semanticName,
    );

    // Find semantic symbol and determine parentId using helper method
    const searchName = semanticName || name;
    const { parentId } = this.findSemanticSymbolForBlock(
      scopeType,
      searchName,
      parentScope,
    );

    // Create the block symbol ID
    // Ensure fileUri is normalized (has file:// prefix) for consistent ID format
    // For method blocks, we want the ID to append directly to the method symbol's path
    let id: string;
    if (
      scopeType === 'method' &&
      scopePath.length === 1 &&
      scopePath[0].includes(':')
    ) {
      // This is a method block - append the block name directly to the method symbol's path
      // Normalize fileUri by generating a temp ID and extracting the URI portion
      // SymbolFactory.generateId calls convertToUri internally to normalize
      const tempId = SymbolFactory.generateId('temp', fileUri);
      const normalizedFileUri = tempId.split(':temp')[0];
      id = `${normalizedFileUri}:${scopePath[0]}:block:${name}`;
    } else {
      // Use standard ID generation for other block types (already normalizes URI via generateSymbolId)
      id = SymbolFactory.generateId(name, fileUri, scopePath, 'block');
    }

    const key: SymbolKey = {
      prefix: scopeType,
      name,
      path: scopePath ? [fileUri, ...scopePath, name] : [fileUri, name],
      unifiedId: id,
      fileUri,
      kind: SymbolKind.Block,
    };

    const modifiers: SymbolModifiers = {
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

    // For block symbols, symbolRange and identifierRange should be the same
    const blockLocation: SymbolLocation = {
      symbolRange: location.symbolRange,
      identifierRange: location.symbolRange, // Same as symbolRange for blocks
    };

    // Use SymbolFactory to create the appropriate ScopeSymbol subclass
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
   * Called when entering an annotation in the Apex code.
   * Processes the annotation and its parameters, creating an annotation object.
   * @param ctx The parser context for the annotation.
   */
  enterAnnotation(ctx: AnnotationContext): void {
    try {
      // Extract qualified annotation name via parser context
      const qn = ctx.qualifiedName?.();
      const ids = qn?.id();
      const _name =
        ids && ids.length > 0
          ? ids.map((i) => i.text).join('.')
          : (ctx.text || '').replace(/^@/, '');
      // Preserve parameters in the annotation name for compatibility with existing tests
      const nameWithParams = (ctx.text || '').replace(/^@/, '');

      const parameters: AnnotationParameter[] = [];

      // elementValuePairs form: name = value (, name = value)*
      const pairs = ctx.elementValuePairs?.();
      if (pairs) {
        const list = pairs.elementValuePair?.() || [];
        for (const p of list) {
          const pname = p.id()?.text;
          const pvalCtx = p.elementValue?.();
          const pval = pvalCtx
            ? this.getTextFromContext(pvalCtx as unknown as ParserRuleContext)
            : '';
          parameters.push({ name: pname, value: pval });
        }
      } else {
        // Single elementValue (positional) form
        const single = ctx.elementValue?.();
        if (single) {
          const value = this.getTextFromContext(
            single as unknown as ParserRuleContext,
          );
          parameters.push({ value });
        }
      }

      const annotation: Annotation = {
        name: nameWithParams,
        location: this.getLocation(ctx),
        parameters,
      };

      this.currentAnnotations.push(annotation);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in annotation: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting an annotation
   * Finalizes annotation processing and validates annotation structure
   */
  exitAnnotation(ctx: AnnotationContext): void {
    try {
      // Annotation validation can be added here if needed
      // The annotation has already been added to currentAnnotations in enterAnnotation
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting annotation: ${errorMessage}`, ctx);
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
      const currentType = this.getCurrentType();
      const currentMethod = this.getCurrentMethod();
      if (
        currentType &&
        isInterfaceSymbol(currentType) &&
        currentMethod &&
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
   * Called when exiting a modifier
   * Validates modifier combinations and ensures no conflicting modifiers
   */
  exitModifier(ctx: ModifierContext): void {
    try {
      const modifiers = this.getCurrentModifiers();

      // Validate modifier combinations
      // Note: Visibility is stored as a single enum value, not individual booleans
      // Multiple visibility modifiers would be caught during parsing/application
      // The visibility enum ensures only one visibility modifier can be set

      // Check for conflicting access modifiers
      if (modifiers.isFinal && modifiers.isAbstract) {
        this.addError(
          'Conflicting modifiers: final and abstract cannot be used together',
          ctx,
        );
      }

      // Additional modifier validation can be added here
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting modifier: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a class declaration in the Apex code.
   * Processes the class declaration, its modifiers, superclass, interfaces, and annotations.
   * @param ctx The parser context for the class declaration.
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownClass';

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Class,
        !this.getCurrentType(), // isTopLevel
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
        // Continue symbol creation to maximize collection robustness even with invalid identifiers
      }

      // Check for duplicate class name in the same scope
      const currentType = this.getCurrentType();
      if (currentType) {
        if (name === currentType.name) {
          this.addError(
            `Inner class '${name}' cannot have the same name as its outer class '${currentType.name}'.`,
            ctx,
          );
        }

        // Check for nested inner class by checking if currentType is nested within another inner class
        // Use the helper method that traverses the parent chain to find nested inner classes
        if (this.isNestedInInnerClass(currentType)) {
          this.addError(
            `Inner class '${name}' cannot be defined within another inner class. ` +
              'Apex does not support nested inner classes.',
            ctx,
          );
        }
      }

      // Validate class in interface
      InterfaceBodyValidator.validateClassInInterface(
        name,
        ctx,
        currentType,
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
        !!currentType, // isInnerClass
        currentType,
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

      // Create a new class symbol
      // For top-level classes, ensure parentId is null regardless of stack state
      // Check if this is a top-level class - stack should be empty for top-level classes
      const isTopLevel = this.scopeStack.isEmpty();
      // Create the symbol - createTypeSymbol will use getCurrentType() which may return null
      // For top-level classes, we need to ensure parentId is null so they're added to root scope
      const classSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Class,
        modifiers,
      );
      // CRITICAL: Explicitly set parentId to null for top-level classes BEFORE adding to symbol table
      // This ensures they are added to root scope correctly in addSymbol()
      // Use stack.isEmpty() as the definitive check for top-level classes
      if (isTopLevel) {
        classSymbol.parentId = null;
      }

      // Set superclass and interfaces
      if (superclass) {
        classSymbol.superClass = superclass;
      }
      classSymbol.interfaces = interfaces;

      // Add annotations to the class symbol
      if (annotations.length > 0) {
        classSymbol.annotations = annotations;
      }

      // Add symbol to current scope (null when stack is empty = file level)
      this.symbolTable.addSymbol(classSymbol, this.getCurrentScopeSymbol());

      // Parent property removed - parentId is set during symbol creation

      // Create class block symbol directly (stack-only scope tracking)
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        parentScope,
        name, // Pass the class name so createBlockSymbol can find the class symbol
      );

      // Push block symbol onto stack
      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

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
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a class scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'class') {
        this.logger.warn(
          `Expected class scope on exitClassDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Called when entering an interface declaration
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownInterface';

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Interface,
        !this.getCurrentType(), // isTopLevel
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
        // Continue symbol creation to maximize collection robustness even with invalid identifiers
      }

      // Validate interface in interface
      const currentType = this.getCurrentType();
      InterfaceBodyValidator.validateInterfaceInInterface(
        name,
        ctx,
        currentType,
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
        !!currentType, // isInnerInterface
        currentType,
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

      // Add symbol to current scope (null when stack is empty = file level)
      this.symbolTable.addSymbol(interfaceSymbol, this.getCurrentScopeSymbol());

      // Create interface block symbol directly (stack-only scope tracking)
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        parentScope,
        name, // Pass the interface name so createBlockSymbol can find the interface symbol
      );

      // Push block symbol onto stack
      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

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
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a class scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'class') {
        this.logger.warn(
          `Expected class scope on exitInterfaceDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Called when entering a method declaration in the Apex code.
   * Processes the method declaration, its modifiers, return type, and annotations.
   * @param ctx The parser context for the method declaration.
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    try {
      // Enhanced debug logging for method name extraction
      const idNode = ctx.id();
      let name = idNode?.text ?? 'unknownMethod';

      // If the ID node is empty, try to extract from formal parameters
      if (!name || name.trim() === '') {
        const formalParams = ctx.formalParameters();
        if (formalParams) {
          // The method name is typically the first part before the parentheses
          const paramsText = formalParams.text;
          const match = paramsText.match(/^([^(]+)\(/);
          if (match) {
            name = match[1].trim();
          }
        }
      }
      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Method,
        false, // Methods are never top-level
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
        // Continue symbol creation to maximize collection robustness even with invalid identifiers
      }

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
      const currentType = this.getCurrentType();
      if (modifiers.isOverride) {
        const parentClass = currentType ? this.getParent(currentType) : null;
        if (!parentClass) {
          this.addWarning(
            `Override method ${name} must ensure a parent class has a compatible method`,
            ctx,
          );
        }
      }

      // Check for duplicate method in the same scope
      if (currentType) {
        // Use the type's scope (not current scope) to find methods
        const typeScope = this.getTypeScope();
        if (!typeScope) {
          return;
        }
        // Use getSymbolsInScope to find methods with the same name (more efficient)
        const existingMethods = this.symbolTable
          .getSymbolsInScope(typeScope.id)
          .filter((s) => s.name === name);

        // Get the parameter types for the current method being checked
        const currentParamTypes =
          ctx
            .formalParameters()
            ?.formalParameterList()
            ?.formalParameter()
            ?.map((param) => this.getTextFromContext(param.typeRef()))
            .join(',') || '';

        // Check for duplicate by name and parameter signature
        const duplicateMethod = existingMethods.find((s: ApexSymbol) => {
          if (!isMethodSymbol(s)) {
            return false;
          }
          // Compare parameter types - both should have same parameter signature
          const existingParamTypes =
            s.parameters
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

      // CRITICAL: Ensure method's parentId points to the class block (for uniform FQN hierarchy)
      // The method symbol's parentId should be set to the class block's id
      // This ensures FQN calculation follows: class -> class block -> method block -> ...
      // Find the class block from the stack
      const classBlock = this.getCurrentScopeSymbol();
      if (classBlock && classBlock.scopeType === 'class') {
        methodSymbol.parentId = classBlock.id;
      } else if (currentType) {
        // Fallback: if we can't find the class block, use the class symbol
        methodSymbol.parentId = currentType.id;
      }

      // Add method symbol to current scope (null when stack is empty = file level)
      // Note: addSymbol will NOT override parentId if it's already set to a non-null value
      this.symbolTable.addSymbol(methodSymbol, this.getCurrentScopeSymbol());

      // Create method block symbol directly (stack-only scope tracking)
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockName = this.generateBlockName('method');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'method',
        location,
        parentScope,
        name, // Pass the method name so createBlockSymbol can find the method symbol
      );

      // Push block symbol onto stack
      this.scopeStack.push(blockSymbol);
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
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a method scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'method') {
        this.logger.warn(
          `Expected method scope on exitMethodDeclaration, but got ${popped.scopeType}`,
        );
      }
    }

    // Reset modifiers and annotations for the next symbol
    this.resetModifiers();
    this.resetAnnotations();
  }

  /**
   * Called when entering a constructor declaration in the Apex code.
   * Processes the constructor declaration, its modifiers, and validates visibility.
   * @param ctx The parser context for the constructor declaration.
   */
  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    try {
      // Extract constructor name from the qualified name in the context
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

      // Extract the constructor name (should be a single identifier)
      const currentType = this.getCurrentType();
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

      // Validate constructor in interface
      InterfaceBodyValidator.validateConstructorInInterface(
        name,
        ctx,
        currentType,
        this,
      );

      // Check for duplicate constructor
      if (currentType) {
        // Use the type's scope (not current scope) to find constructors
        const typeScope = this.getTypeScope();
        if (!typeScope) {
          return;
        }
        // Use getSymbolsInScope to find constructors with the same name (more efficient)
        const existingConstructors = this.symbolTable
          .getSymbolsInScope(typeScope.id)
          .filter((s) => s.name === name);

        // Get the parameter types for the current constructor
        const currentParamTypes =
          ctx
            .formalParameters()
            ?.formalParameterList()
            ?.formalParameter()
            ?.map((param) => this.getTextFromContext(param.typeRef()))
            .join(',') || '';

        const duplicateConstructor = existingConstructors.find(
          (s: ApexSymbol) => {
            if (!isConstructorSymbol(s)) {
              return false;
            }
            const existingParamTypes =
              s.parameters
                ?.map((param) => param.type.originalTypeString)
                .join(',') || '';
            return existingParamTypes === currentParamTypes;
          },
        );

        if (duplicateConstructor) {
          this.addError(`Duplicate constructor declaration: ${name}`, ctx);
          return;
        }
      }

      const modifiers = this.getCurrentModifiers();

      // Create constructor symbol using dedicated createConstructorSymbol method
      // The getIdentifierLocation method will automatically handle qualified names
      // and extract the proper identifier location from the parser structure
      const constructorSymbol = this.createConstructorSymbol(
        ctx,
        name,
        modifiers,
      );

      // CRITICAL: Ensure constructor's parentId points to the class block (for uniform FQN hierarchy)
      // Find the class block from the stack
      const classBlock = this.getCurrentScopeSymbol();
      if (classBlock && classBlock.scopeType === 'class') {
        constructorSymbol.parentId = classBlock.id;
      }

      this.symbolTable.addSymbol(
        constructorSymbol,
        this.getCurrentScopeSymbol(),
      );
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockSymbol = this.createBlockSymbol(
        name,
        'method',
        location,
        parentScope,
      );

      // Push block symbol onto stack
      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }
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
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a method scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'method') {
        this.logger.warn(
          `Expected method scope on exitConstructorDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
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
      // Enhanced debug logging for interface method name extraction
      const idNode = ctx.id();
      const name = idNode?.text ?? 'unknownMethod';

      // Get current annotations
      const annotations = this.getCurrentAnnotations();

      // Check for duplicate method in the same scope
      const currentType = this.getCurrentType();
      if (currentType) {
        // Use the type's scope (not current scope) to find interface methods
        const typeScope = this.getTypeScope();
        if (!typeScope) {
          return;
        }
        // Use getSymbolsInScope to find methods with the same name (more efficient)
        const existingMethods = this.symbolTable
          .getSymbolsInScope(typeScope.id)
          .filter((s) => s.name === name);
        // Filter to only method symbols (exclude block symbols)
        const duplicateMethod = existingMethods.find(
          (s: ApexSymbol) => isMethodSymbol(s) && s.name === name,
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
        isBuiltIn: false,
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

      // Add method symbol to current scope (null when stack is empty = file level)
      this.symbolTable.addSymbol(methodSymbol, this.getCurrentScopeSymbol());

      // Create method block symbol directly (stack-only scope tracking)
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockSymbol = this.createBlockSymbol(
        name,
        'method',
        location,
        parentScope,
      );

      // Push block symbol onto stack
      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }

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
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a method scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'method') {
        this.logger.warn(
          `Expected method scope on exitInterfaceMethodDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Called when entering a formal parameter (method parameter)
   */
  enterFormalParameter(ctx: FormalParameterContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownParameter';
      const typeRef = ctx.typeRef();
      const type = typeRef
        ? this.createTypeInfoFromTypeRef(typeRef)
        : createTypeInfo('Object');
      const modifiers = this.getCurrentModifiers();

      // Create parameter symbol using createVariableSymbol method
      const paramSymbol = this.createVariableSymbol(
        ctx,
        modifiers,
        name,
        SymbolKind.Parameter,
        type,
      );

      const currentMethod = this.getCurrentMethod();
      if (currentMethod) {
        currentMethod.parameters.push(paramSymbol);
      }
      this.symbolTable.addSymbol(paramSymbol, this.getCurrentScopeSymbol());
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in parameter: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a formal parameter
   * Resets modifiers and annotations to prevent leakage to the next parameter
   */
  exitFormalParameter(ctx: FormalParameterContext): void {
    try {
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting parameter: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering formal parameters
   * Tracks parameter collection for validation
   */
  enterFormalParameters(ctx: FormalParametersContext): void {
    try {
      // Parameter collection is handled by enterFormalParameter
      // This method provides a hook for future validation needs
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering formal parameters: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting formal parameters
   * Validates parameter count and ensures all parameters were processed
   */
  exitFormalParameters(ctx: FormalParametersContext): void {
    try {
      const currentMethod = this.getCurrentMethod();
      if (currentMethod) {
        // Validate parameter count if needed
        const paramList = ctx.formalParameterList();
        const expectedCount = paramList?.formalParameter()?.length ?? 0;
        const actualCount = currentMethod.parameters.length;
        if (expectedCount !== actualCount) {
          this.logger.warn(
            `Parameter count mismatch: expected ${expectedCount}, got ${actualCount}`,
          );
        }
      }
      // Reset state after parameter list
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting formal parameters: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a property declaration
   */
  enterPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    try {
      const typeRef = ctx.typeRef();
      if (!typeRef) {
        this.addError('Property declaration missing type reference', ctx);
        return;
      }
      const type = this.createTypeInfoFromTypeRef(typeRef);
      const name = ctx.id?.()?.text ?? 'unknownProperty';

      // Get current modifiers
      const modifiers = this.getCurrentModifiers();

      // Validate property declaration in interface
      const currentType = this.getCurrentType();
      if (currentType) {
        InterfaceBodyValidator.validatePropertyInInterface(
          modifiers,
          ctx,
          currentType,
          this,
        );
        // Additional field/property modifier validations
        PropertyModifierValidator.validatePropertyVisibilityModifiers(
          modifiers,
          ctx,
          currentType,
          this,
        );
      }

      // Create and add the property symbol
      const propertySymbol = this.createVariableSymbol(
        ctx,
        modifiers,
        name,
        SymbolKind.Property,
        type,
      );
      this.symbolTable.addSymbol(propertySymbol, this.getCurrentScopeSymbol());

      // Capture the property name as a type reference
      const propertyNameNode = ctx.id?.();
      if (propertyNameNode) {
        const propertyLocation = this.getLocation(
          propertyNameNode as unknown as ParserRuleContext,
        );
        const propertyReference =
          SymbolReferenceFactory.createPropertyReference(
            name,
            propertyLocation,
          );
        this.symbolTable.addTypeReference(propertyReference);
      }

      // Reset modifiers and annotations for the next symbol
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in property declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a property declaration
   * Resets modifiers and annotations after property processing
   */
  exitPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    try {
      // Ensure modifiers and annotations are reset
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting property declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a field declaration
   * Grammar: fieldDeclaration : typeRef variableDeclarators SEMI
   *
   * This method validates field declarations. Individual variable declarators
   * are processed by enterVariableDeclarator.
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    try {
      const typeRef = ctx.typeRef();
      if (!typeRef) {
        this.addError('Field declaration missing type reference', ctx);
        return;
      }

      // Get current modifiers for validation
      // Note: We don't reset modifiers here - they're reset in enterVariableDeclarator
      // This allows enterVariableDeclarator to access them
      const modifiers = this.getCurrentModifiers();

      // Validate field declaration in interface
      const currentType = this.getCurrentType();
      if (currentType) {
        InterfaceBodyValidator.validateFieldInInterface(
          modifiers,
          ctx,
          currentType,
          this,
        );

        // Additional field modifier validations
        FieldModifierValidator.validateFieldVisibilityModifiers(
          modifiers,
          ctx,
          currentType,
          this,
        );
      }

      // Note: Individual variable declarators are processed by enterVariableDeclarator
      // which will be called automatically by the parser for each variable declarator
      // in the variableDeclarators list. Modifiers and annotations are reset there.
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in field declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a field declaration
   * Resets modifiers and annotations after field processing
   */
  exitFieldDeclaration(ctx: FieldDeclarationContext): void {
    try {
      // Ensure modifiers and annotations are reset
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting field declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a local variable declaration
   * Grammar: localVariableDeclaration : modifier* typeRef variableDeclarators
   *
   * This method prepares the type information. Individual variable declarators
   * are processed by enterVariableDeclarator.
   */
  enterLocalVariableDeclaration(ctx: LocalVariableDeclarationContext): void {
    try {
      // Store modifiers for use by enterVariableDeclarator
      // Note: We don't reset modifiers here - they're reset in enterVariableDeclarator
      // This allows enterVariableDeclarator to access them
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error in local variable declaration: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Called when exiting a local variable declaration
   * Resets modifiers and annotations after local variable processing
   */
  exitLocalVariableDeclaration(ctx: LocalVariableDeclarationContext): void {
    try {
      // Ensure modifiers and annotations are reset
      this.resetModifiers();
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error exiting local variable declaration: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Called when entering a variable declarator
   * Grammar: variableDeclarator : id (ASSIGN expression)?
   *
   * This handles each variable in declarations like "String a, b, c"
   * Each variable declarator is processed individually, allowing proper
   * type ref linking and assignment expression capture.
   *
   * This method handles both local variables (from LocalVariableDeclarationContext)
   * and fields (from FieldDeclarationContext).
   */
  enterVariableDeclarator(ctx: VariableDeclaratorContext): void {
    try {
      // Find the parent context (either LocalVariableDeclarationContext or FieldDeclarationContext)
      let parent = ctx.parent;
      let localVarDeclContext: LocalVariableDeclarationContext | null = null;
      let fieldDeclContext: FieldDeclarationContext | null = null;

      while (parent) {
        if (parent instanceof LocalVariableDeclarationContext) {
          localVarDeclContext = parent;
          break;
        }
        if (parent instanceof FieldDeclarationContext) {
          fieldDeclContext = parent;
          break;
        }
        parent = parent.parent;
      }

      // Determine if this is a local variable or a field
      const isLocalVariable = !!localVarDeclContext;
      const isField = !!fieldDeclContext;

      if (!isLocalVariable && !isField) {
        // This shouldn't happen, but if it does, skip processing
        return;
      }

      const modifiers = this.getCurrentModifiers();
      this.resetModifiers();

      // Get the type ref from the parent declaration
      let typeRef: TypeRefContext | undefined;
      let parentContext: ParserRuleContext;

      if (isLocalVariable && localVarDeclContext) {
        typeRef = localVarDeclContext.typeRef();
        parentContext = localVarDeclContext;
      } else if (isField && fieldDeclContext) {
        typeRef = fieldDeclContext.typeRef();
        parentContext = fieldDeclContext;
      } else {
        return;
      }

      const varType = typeRef
        ? this.createTypeInfoFromTypeRef(typeRef, parentContext)
        : createTypeInfo('Object');

      const name = ctx.id()?.text ?? 'unknownVariable';

      // Check for duplicate variable names within the same statement
      // We need to check against other variables in the same variableDeclarators context
      let variableDeclarators:
        | { variableDeclarator(): VariableDeclaratorContext[] }
        | null
        | undefined = null;

      if (isLocalVariable && localVarDeclContext) {
        variableDeclarators = localVarDeclContext.variableDeclarators();
      } else if (isField && fieldDeclContext) {
        variableDeclarators = fieldDeclContext.variableDeclarators();
      }

      if (variableDeclarators) {
        const declarators = variableDeclarators.variableDeclarator();
        const statementVariableNames = new Set<string>();

        // Collect all names declared in this statement
        for (const declarator of declarators) {
          const declName = declarator.id()?.text;
          if (declName) {
            statementVariableNames.add(declName);
          }
        }

        // Check if this variable name appears multiple times in the statement
        const nameCount = Array.from(statementVariableNames).filter(
          (n) => n === name,
        ).length;
        if (nameCount > 1) {
          this.addError(
            `Duplicate variable declaration: '${name}' is already declared in this statement`,
            ctx,
          );
          return; // Skip processing this duplicate variable
        }
      }

      // Check for duplicate variable declaration in the current scope (from previous statements)
      const existingSymbol = this.symbolTable.findSymbolInCurrentScope(
        name,
        this.getCurrentScopeSymbol(),
      );
      if (existingSymbol) {
        this.addError(
          `Duplicate variable declaration: '${name}' is already declared in this scope`,
          ctx,
        );
        return; // Skip processing this duplicate variable
      }

      // Process the variable declarator (this will create the symbol)
      // The assignment expression (if present) will be automatically captured
      // by the parser's tree walk through enterExpression, enterMethodCall, etc.
      this.processVariableDeclarator(
        ctx,
        varType,
        modifiers,
        isField ? SymbolKind.Field : SymbolKind.Variable,
      );

      // Reset annotations after processing the variable declarator
      // This ensures annotations don't leak to the next symbol declaration
      this.resetAnnotations();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in variable declarator: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a variable declarator
   * Performs post-processing validation
   */
  exitVariableDeclarator(ctx: VariableDeclaratorContext): void {
    try {
      // Post-processing validation can be added here if needed
      // Type reference linking is already complete at this point
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting variable declarator: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering variable declarators
   * Tracks declaration groups for validation
   */
  enterVariableDeclarators(ctx: VariableDeclaratorsContext): void {
    try {
      // Declaration group tracking can be added here if needed
      // Individual declarators are processed by enterVariableDeclarator
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(
        `Error entering variable declarators: ${errorMessage}`,
        ctx,
      );
    }
  }

  /**
   * Called when exiting variable declarators
   * Validates all variables declared together and ensures proper type linking
   */
  exitVariableDeclarators(ctx: VariableDeclaratorsContext): void {
    try {
      const declarators = ctx.variableDeclarator();
      if (declarators && declarators.length > 0) {
        // Validate all variables declared together
        const names = new Set<string>();
        for (const declarator of declarators) {
          const name = declarator.id()?.text;
          if (name) {
            if (names.has(name)) {
              this.addError(
                `Duplicate variable declaration: '${name}' is already declared in this statement`,
                declarator,
              );
            } else {
              names.add(name);
            }
          }
        }
      }
      // Finalize declaration group - ensure proper type linking
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting variable declarators: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering an enum declaration
   */
  enterEnumDeclaration(ctx: EnumDeclarationContext): void {
    try {
      const name = ctx.id()?.text ?? 'unknownEnum';

      // Validate enum in interface
      const currentType = this.getCurrentType();
      InterfaceBodyValidator.validateEnumInInterface(
        name,
        ctx,
        currentType,
        this,
      );

      const modifiers = this.getCurrentModifiers();

      // Create enum symbol using createTypeSymbol method
      const enumSymbol = this.createTypeSymbol(
        ctx,
        name,
        SymbolKind.Enum,
        modifiers,
      );

      this.symbolTable.addSymbol(enumSymbol, this.getCurrentScopeSymbol());
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockName = this.generateBlockName('class');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'class',
        location,
        parentScope,
        name, // Pass the enum name so createBlockSymbol can find the enum symbol
      );

      // Push block symbol onto stack
      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }
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
      const currentType = this.getCurrentType();
      if (!isEnumSymbol(currentType)) {
        this.addError('Enum constants found outside of enum declaration', ctx);
        return;
      }

      const enumType = this.createTypeInfo(currentType?.name ?? 'Object');
      const enumSymbol = currentType;

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
        );

        enumSymbol.values.push(valueSymbol);
        this.symbolTable.addSymbol(valueSymbol, this.getCurrentScopeSymbol());
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in enum constants: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting enum constants
   * Validates enum values and checks for duplicates
   */
  exitEnumConstants(ctx: EnumConstantsContext): void {
    try {
      const currentType = this.getCurrentType();
      if (!isEnumSymbol(currentType)) {
        return;
      }

      const enumSymbol = currentType;
      const names = new Set<string>();

      // Check for duplicate enum values
      for (const valueSymbol of enumSymbol.values) {
        if (names.has(valueSymbol.name)) {
          this.addError(
            `Duplicate enum value: '${valueSymbol.name}' is already defined`,
            ctx,
          );
        } else {
          names.add(valueSymbol.name);
        }
      }

      // Finalize enum value collection
      // Additional validation can be added here if needed
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting enum constants: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting an enum declaration
   */
  exitEnumDeclaration(): void {
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a class scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'class') {
        this.logger.warn(
          `Expected class scope on exitEnumDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Called when entering a block
   * Always creates a block scope - the stack order determines the parent scope
   */
  enterBlock(ctx: BlockContext): void {
    try {
      const name = this.generateBlockName('block');
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockSymbol = this.createBlockSymbol(
        name,
        'block',
        location,
        parentScope,
      );

      if (!blockSymbol) {
        this.addError('Failed to create block symbol', ctx);
        return;
      }
      this.scopeStack.push(blockSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in block: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a block
   * Always exits the block scope - the stack order determines what gets popped
   */
  exitBlock(): void {
    this.exitScope('block');
  }

  /**
   * Called when entering an if statement
   */
  enterIfStatement(ctx: IfStatementContext): void {
    this.enterScope('if', ctx);
  }

  /**
   * Called when exiting an if statement
   */
  exitIfStatement(): void {
    this.exitScope('if');
  }

  /**
   * Called when entering a while statement
   */
  enterWhileStatement(ctx: WhileStatementContext): void {
    this.enterScope('while', ctx);
  }

  /**
   * Called when exiting a while statement
   */
  exitWhileStatement(): void {
    this.exitScope('while');
  }

  /**
   * Called when entering a for statement
   */
  enterForStatement(ctx: ForStatementContext): void {
    this.enterScope('for', ctx);
  }

  /**
   * Called when exiting a for statement
   */
  exitForStatement(): void {
    this.exitScope('for');
  }

  /**
   * Called when entering for control
   * Validates for loop structure
   */
  enterForControl(ctx: ForControlContext): void {
    try {
      // For loop structure validation can be added here
      // The control structure is: enhancedForControl | forInit? SEMI expression? SEMI forUpdate?
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering for control: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting for control
   * Validates for loop structure and ensures proper control flow
   */
  exitForControl(ctx: ForControlContext): void {
    try {
      // Validate for loop structure
      // Additional validation can be added here if needed
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting for control: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering for update
   * Tracks update operations
   */
  enterForUpdate(ctx: ForUpdateContext): void {
    try {
      // For update expression tracking can be added here
      // The update is an expressionList
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering for update: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting for update
   * Validates for update expressions
   */
  exitForUpdate(ctx: ForUpdateContext): void {
    try {
      // Validate for update expressions
      // Additional validation can be added here if needed
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting for update: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a try statement
   */
  enterTryStatement(ctx: TryStatementContext): void {
    this.enterScope('try', ctx);
  }

  /**
   * Called when exiting a try statement
   */
  exitTryStatement(): void {
    this.exitScope('try');
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

      // Add symbol to current scope (null when stack is empty = file level)
      this.symbolTable.addSymbol(triggerSymbol, this.getCurrentScopeSymbol());

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
      this.addError(`Error in trigger declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a trigger declaration
   */
  exitTriggerMemberDeclaration(): void {
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a class scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'class') {
        this.logger.warn(
          `Expected class scope on exitTriggerMemberDeclaration, but got ${popped.scopeType}`,
        );
      }
    }
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

      // Add symbol to current scope (null when stack is empty = file level)
      this.symbolTable.addSymbol(triggerSymbol, this.getCurrentScopeSymbol());

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
      this.addError(`Error in trigger declaration: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a trigger unit
   */
  exitTriggerUnit(): void {
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a class scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'class') {
        this.logger.warn(
          `Expected class scope on exitTriggerUnit, but got ${popped.scopeType}`,
        );
      }
    }

    // Second pass: Correct reference contexts using symbol table
    this.correctReferenceContexts();
  }

  /**
   * Called when exiting the compilation unit (top-level rule for class files)
   * This is the perfect place for second-pass reference context correction
   * since all parsing is complete and we have the full symbol table
   */
  exitCompilationUnit(): void {
    // Second pass: Correct reference contexts using symbol table
    this.correctReferenceContexts();

    // Defensive cleanup: Ensure methodCallStack is empty after parsing
    this.validateMethodCallStackCleanup();
  }

  /**
   * Called when exiting an anonymous unit (top-level rule for anonymous Apex scripts)
   * This is the perfect place for second-pass reference context correction
   */
  exitAnonymousUnit(): void {
    // Second pass: Correct reference contexts using symbol table
    this.correctReferenceContexts();

    // Defensive cleanup: Ensure methodCallStack is empty after parsing
    this.validateMethodCallStackCleanup();
  }

  /**
   * Called when entering a finally block
   */
  enterFinallyBlock(ctx: FinallyBlockContext): void {
    this.enterScope('finally', ctx);
  }

  /**
   * Called when exiting a finally block
   */
  exitFinallyBlock(): void {
    this.exitScope('finally');
  }

  /**
   * Called when entering a switch statement
   */
  enterSwitchStatement(ctx: SwitchStatementContext): void {
    this.enterScope('switch', ctx);
  }

  /**
   * Called when exiting a switch statement
   */
  exitSwitchStatement(): void {
    this.exitScope('switch');
  }

  /**
   * Called when entering a when control (switch when clause)
   */
  enterWhenControl(ctx: WhenControlContext): void {
    this.enterScope('when', ctx);
  }

  /**
   * Called when exiting a when control
   */
  exitWhenControl(): void {
    this.exitScope('when');
  }

  /**
   * Called when entering a do-while statement
   */
  enterDoWhileStatement(ctx: DoWhileStatementContext): void {
    this.enterScope('doWhile', ctx);
  }

  /**
   * Called when exiting a do-while statement
   */
  exitDoWhileStatement(): void {
    this.exitScope('doWhile');
  }

  /**
   * Called when entering a runAs statement
   */
  enterRunAsStatement(ctx: RunAsStatementContext): void {
    this.enterScope('runAs', ctx);
  }

  /**
   * Called when exiting a runAs statement
   */
  exitRunAsStatement(): void {
    this.exitScope('runAs');
  }

  /**
   * Called when entering a getter (property getter block)
   */
  enterGetter(ctx: GetterContext): void {
    this.enterScope('getter', ctx);
  }

  /**
   * Called when exiting a getter
   */
  exitGetter(): void {
    this.exitScope('getter');
  }

  /**
   * Called when entering a setter (property setter block)
   */
  enterSetter(ctx: SetterContext): void {
    this.enterScope('setter', ctx);
  }

  /**
   * Called when exiting a setter
   */
  exitSetter(): void {
    this.exitScope('setter');
  }

  // NEW: Type Reference Capture Methods - Using Specific ANTLR Contexts

  /**
   * Capture method call references (e.g., "FileUtilities.createFile(...)")
   */
  enterMethodCallExpression(ctx: MethodCallExpressionContext): void {
    // No-op: method calls are captured in enterMethodCall for precise identifier locations
  }

  /**
   * Capture constructor call references (e.g., "new Property__c()")
   */
  enterNewExpression(ctx: NewExpressionContext): void {
    try {
      this.captureConstructorCallReference(ctx);
    } catch (error) {
      this.logger.warn(
        () => `Error capturing constructor call reference: ${error}`,
      );
    }
  }

  /**
   * Exit new expression - pop constructor call from stack if it was tracked
   */
  exitNewExpression(ctx: NewExpressionContext): void {
    try {
      // Check if there's a constructor call on the stack that matches this context
      const stackEntry = this.methodCallStack.peek();
      if (
        stackEntry &&
        stackEntry.callRef.context === ReferenceContext.CONSTRUCTOR_CALL
      ) {
        // Verify this is the constructor call we're exiting by checking location
        // If the top of stack is a constructor call, pop it
        const popped = this.methodCallStack.pop();
        if (popped) {
          // If there's a parent method call on the stack, add this constructor as a parameter
          const parentEntry = this.methodCallStack.peek();
          if (parentEntry) {
            parentEntry.parameterRefs.push(popped.callRef);
          }
        }
      }
    } catch (error) {
      this.logger.warn(() => `Error exiting NewExpression: ${error}`);
    }
  }

  /**
   * Capture field access references (e.g., "property.Id")
   */
  enterDotExpression(ctx: DotExpressionContext): void {
    // Suppress during LHS of assignment to avoid duplicate captures
    if (this.shouldSuppress(ctx)) {
      return;
    }

    // Start a new chain expression scope
    if (!this.chainExpressionScope) {
      this.chainExpressionScope = this.createNewChainScope(ctx);
    } else {
      // We're already in a chain scope, increment depth
      this.chainExpressionScope.depth++;
    }
  }

  /**
   * Exit dot expression to finalize chain processing
   */
  exitDotExpression(ctx: DotExpressionContext): void {
    if (this.chainExpressionScope) {
      if (this.chainExpressionScope.depth === 0) {
        // Exiting the root chain expression scope
        this.finalizeChainScope(this.chainExpressionScope);

        // Clear the scope
        this.chainExpressionScope = null;
      } else {
        // Decrement depth for nested expressions
        this.chainExpressionScope.depth--;
      }
    }
  }

  /**
   * Capture unqualified method calls using dedicated MethodCallContext
   *
   * Pushes the method call onto methodCallStack for parameter tracking.
   * The stack entry will collect parameter references as expressions are processed
   * within the ExpressionListContext that follows.
   */
  enterMethodCall(ctx: MethodCallContext): void {
    let pushed = false;
    try {
      const idNode = ctx.id();
      const methodName = idNode?.text || 'unknownMethod';
      const location = idNode
        ? this.getLocation(idNode)
        : this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName();

      const reference = SymbolReferenceFactory.createMethodCallReference(
        methodName,
        location,
        parentContext,
      );

      // Push onto method call stack for parameter tracking
      // This happens BEFORE ExpressionListContext is entered, so parameters
      // can be collected via addToCurrentMethodParameters()
      this.methodCallStack.push({
        callRef: reference,
        parameterRefs: [],
      });
      pushed = true;

      // Also add to symbol table for general tracking
      this.symbolTable.addTypeReference(reference);
    } catch (error) {
      // Defensive cleanup: if we pushed but error occurred, pop to prevent stack leak
      if (pushed) {
        try {
          this.methodCallStack.pop();
        } catch (popError) {
          this.logger.warn(
            () => `Error cleaning up methodCallStack: ${popError}`,
          );
        }
      }
      this.logger.warn(() => `Error capturing MethodCall: ${error}`);
    }
  }

  /**
   * Exit method call - pop from stack and add as parameter if nested
   *
   * If this method call was itself a parameter of another method call (indicated by
   * a parent entry on the stack), it's added to the parent's parameterRefs array.
   * This enables hierarchical tracking of nested method calls like a.b(c.d(e)).
   */
  exitMethodCall(ctx: MethodCallContext): void {
    try {
      const stackEntry = this.methodCallStack.pop();
      if (stackEntry) {
        // If there's a parent method call on the stack, add this as a parameter
        const parentEntry = this.methodCallStack.peek();
        if (parentEntry) {
          parentEntry.parameterRefs.push(stackEntry.callRef);
        }
        // The reference was already added to symbol table in enterMethodCall
      }
    } catch (error) {
      this.logger.warn(() => `Error exiting MethodCall: ${error}`);
    }
  }

  /**
   * Capture qualified method calls like "Assert.isFalse(...)" using DotMethodCallContext
   */
  enterDotMethodCall(ctx: DotMethodCallContext): void {
    let pushed = false;
    try {
      const anyIdNode = ctx.anyId();
      const methodName = anyIdNode?.text || 'unknownMethod';
      const methodLocation = anyIdNode
        ? this.getLocation(anyIdNode as unknown as ParserRuleContext)
        : this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName();

      // Create method call reference
      const reference = SymbolReferenceFactory.createMethodCallReference(
        methodName,
        methodLocation,
        parentContext,
      );

      // Push onto method call stack for parameter tracking
      this.methodCallStack.push({
        callRef: reference,
        parameterRefs: [],
      });
      pushed = true;

      // Also handle chain scope tracking (existing logic)
      if (this.chainExpressionScope?.isActive) {
        // Add this method call to the current chain scope
        this.chainExpressionScope.chainNodes.push(
          this.createExpressionNode(
            methodName,
            methodLocation,
            ReferenceContext.METHOD_CALL,
          ),
        );
      } else {
        // Not in chain scope - process as standalone method call
        this.processStandaloneMethodCall(ctx, methodName, methodLocation);
      }

      // Add to symbol table
      this.symbolTable.addTypeReference(reference);
    } catch (error) {
      // Defensive cleanup: if we pushed but error occurred, pop to prevent stack leak
      if (pushed) {
        try {
          this.methodCallStack.pop();
        } catch (popError) {
          this.logger.warn(
            () => `Error cleaning up methodCallStack: ${popError}`,
          );
        }
      }
      this.logger.warn(() => `Error capturing DotMethodCall: ${error}`);
    }
  }

  /**
   * Exit dot method call - pop from stack and add as parameter if nested
   */
  exitDotMethodCall(ctx: DotMethodCallContext): void {
    try {
      const stackEntry = this.methodCallStack.pop();
      if (stackEntry) {
        // If there's a parent method call on the stack, add this as a parameter
        const parentEntry = this.methodCallStack.peek();
        if (parentEntry) {
          parentEntry.parameterRefs.push(stackEntry.callRef);
        }
        // The reference was already added to symbol table in enterDotMethodCall
      }
    } catch (error) {
      this.logger.warn(() => `Error exiting DotMethodCall: ${error}`);
    }
  }

  /**
   * Capture type references in variable declarations
   */
  enterTypeRef(ctx: TypeRefContext): void {
    try {
      const typeNames = ctx.typeName();
      if (!typeNames || typeNames.length === 0) return;

      // Get the first typeName (there should only be one in most cases)
      const typeName = typeNames[0];
      if (!typeName) return;

      // Check if this is a generic argument (inside a TypeList)
      const isGenericArg = this.isGenericArgument(ctx);

      // Determine if this is a type declaration (variable/field declaration) or parameter
      const isTypeDeclaration = this.isTypeDeclarationContext(ctx);

      // Check if this is a method return type context
      const isMethodReturnType = this.isMethodReturnTypeContext(ctx);

      // For qualified type names (e.g., System.Url), we need to combine all type names
      let fullTypeName: string;
      let baseLocation: SymbolLocation | undefined;

      if (typeNames.length > 1) {
        // This is a qualified type name like System.Url
        const typeNameParts = typeNames.map((tn) => {
          const id = tn.id();
          if (id) {
            return id.text;
          } else {
            // Handle collection types
            return `${tn.LIST() || tn.SET() || tn.MAP()}`;
          }
        });
        fullTypeName = typeNameParts.join('.');
        baseLocation = this.getLocationForReference(typeNames[0]);
      } else {
        // Single type name
        const baseTypeId = typeName.id();
        if (baseTypeId) {
          // Regular identifier case: id typeArguments?
          fullTypeName = baseTypeId.text;
          baseLocation = this.getLocationForReference(baseTypeId);
        } else {
          // Collection type case: LIST/SET/MAP typeArguments?
          const listToken = typeName.LIST?.();
          const setToken = typeName.SET?.();
          const mapToken = typeName.MAP?.();
          const token = listToken || setToken || mapToken;

          if (token) {
            fullTypeName =
              token.text || `${listToken ? 'List' : setToken ? 'Set' : 'Map'}`;
            // Get precise location of the token itself, not the entire typeName context
            const identifierRange = this.getIdentifierRange(typeName);
            if (identifierRange) {
              baseLocation = {
                symbolRange: identifierRange,
                identifierRange: identifierRange,
              };
            } else {
              // Fallback to typeName location if identifier range not available
              baseLocation = this.getLocationForReference(typeName);
            }
          } else {
            // Fallback if no token found
            fullTypeName = 'Object';
            baseLocation = this.getLocationForReference(typeName);
          }
        }
      }

      if (fullTypeName && baseLocation) {
        const parentContext = this.determineTypeReferenceContext(ctx);

        // Extract precise locations for dotted type names
        const preciseLocations =
          typeNames.length > 1
            ? this.getPreciseLocationsForDottedType(typeNames)
            : undefined;

        // Create the appropriate type reference based on context
        let baseReference: SymbolReference;

        if (isGenericArg) {
          // Skip creating references for generic arguments here - they are handled by enterTypeArguments
          return;
        } else if (isMethodReturnType) {
          // Use the new createReturnTypeReference method for method return types
          baseReference = SymbolReferenceFactory.createReturnTypeReference(
            fullTypeName,
            baseLocation,
            parentContext,
            preciseLocations,
          );
        } else if (isTypeDeclaration) {
          baseReference = SymbolReferenceFactory.createTypeDeclarationReference(
            fullTypeName,
            baseLocation,
            parentContext,
            preciseLocations,
          );

          // If this TypeRef is a child of a localVariableDeclaration, store the reference
          // keyed by the parent localVariableDeclaration context
          // This allows us to retrieve it later when processing the variable declaration
          const parent = ctx.parent;
          if (
            parent &&
            parent.constructor.name === 'LocalVariableDeclarationContext'
          ) {
            this.localVarDeclToTypeRefMap.set(parent, baseReference);
          }
        } else {
          // For other cases, use PARAMETER_TYPE
          baseReference = SymbolReferenceFactory.createParameterTypeReference(
            fullTypeName,
            baseLocation,
            parentContext,
            preciseLocations,
          );
        }

        this.symbolTable.addTypeReference(baseReference);
      }

      // Generic type arguments are now handled by enterTypeArguments method
      // This provides better separation of concerns and more accurate context tracking
    } catch (error) {
      this.logger.warn(
        () => `Error capturing type declaration reference: ${error}`,
      );
    }
  }

  /**
   * Handle anyId in dot expressions (e.g., the "Id" in "property.Id")
   * This captures field access references directly from the parser structure
   */
  enterAnyId(ctx: AnyIdContext): void {
    try {
      const fieldName = ctx.text;

      // Check if this is part of a dot expression
      const parent = ctx.parent;

      if (parent && isContextType(parent, DotExpressionContext)) {
        const dotContext = parent;

        // Check if we're in an assignment LHS context to avoid duplication
        if (this.isInAssignmentLHS(ctx)) {
          return;
        }

        // Add to chain scope if we're in one
        if (this.chainExpressionScope?.isActive) {
          this.chainExpressionScope.chainNodes.push(
            this.createExpressionNode(
              fieldName,
              this.getLocation(ctx),
              ReferenceContext.FIELD_ACCESS,
            ),
          );

          // Skip creating individual field access reference when in chain scope
          // The HEAD reference will handle the entire chain
          return;
        }

        // Get the left expression (the object)
        const expressions = dotContext.expression();

        // Handle both array and single expression cases
        const leftExpression =
          Array.isArray(expressions) && expressions.length > 0
            ? expressions[0]
            : (expressions ?? null);

        if (leftExpression) {
          // Extract identifiers from the left expression (handles array expressions correctly)
          // For array expressions like "insertedcontacts[0]", this extracts just "insertedcontacts"
          const objectIdentifiers =
            this.extractIdentifiersFromExpression(leftExpression);

          if (objectIdentifiers.length > 0) {
            const objectName = objectIdentifiers[0]; // Use the base identifier, not the full expression

            // Create FIELD_ACCESS reference
            const location = this.getLocationForReference(ctx);
            const parentContext = this.getCurrentMethodName();
            const _qualifierLocation = this.getLocation(
              leftExpression as unknown as ParserRuleContext,
            );

            const fieldRef = SymbolReferenceFactory.createFieldAccessReference(
              fieldName,
              location,
              objectName,
              parentContext,
            );

            this.symbolTable.addTypeReference(fieldRef);

            // If we're collecting method call parameters, add this field access as a parameter
            this.addToCurrentMethodParameters(fieldRef);
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        () => `Error handling anyId in dot expression: ${error}`,
      );
    }
  }

  /**
   * Capture identifier usage in primary expressions (e.g., variable names)
   * This captures simple variable references like "myVariable"
   */
  enterIdPrimary(ctx: IdPrimaryContext): void {
    if (this.shouldSuppress(ctx)) {
      return;
    }

    const variableName = this.getTextFromContext(ctx);

    // Skip emitting a VARIABLE_USAGE when this identifier participates in a dotted
    // expression (e.g., EncodingUtil.urlEncode or obj.field), UNLESS it's a method call parameter.
    // Method call parameters need to be captured even inside dot expressions.
    if (!this.isMethodCallParameter(ctx)) {
      let parent: ParserRuleContext | undefined = ctx.parent;
      while (parent) {
        if (isDotExpressionContext(parent)) {
          return;
        }
        parent = parent.parent;
      }
    }

    const location = this.getLocation(ctx);
    const parentContext = this.getCurrentMethodName();

    const reference = SymbolReferenceFactory.createVariableUsageReference(
      variableName,
      location,
      parentContext,
    );
    this.symbolTable.addTypeReference(reference);

    // If we're collecting method call parameters, add this variable usage as a parameter
    this.addToCurrentMethodParameters(reference);
  }

  /**
   * Capture primary expression references
   * This handles the overall primary expression context
   */
  enterPrimaryExpression(ctx: PrimaryExpressionContext): void {
    // The specific primary types are handled by their individual listeners
    // This method can be used for general primary expression processing if needed
  }

  /**
   * Called when entering a parenthesized expression
   * Tracks parenthesized expressions for better context understanding
   */
  enterParExpression(ctx: ParExpressionContext): void {
    try {
      // Parenthesized expression tracking can be added here
      // The structure is: LPAREN expression RPAREN
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering par expression: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a parenthesized expression
   * Provides cleanup point for expression tracking
   */
  exitParExpression(ctx: ParExpressionContext): void {
    try {
      // Expression tracking cleanup can be added here if needed
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting par expression: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering arguments
   * Detects constructor calls with arguments and validates argument lists
   */
  enterArguments(ctx: ArgumentsContext): void {
    try {
      // Argument list tracking can be added here
      // The structure is: LPAREN expressionList? RPAREN
      // This provides symmetry with formalParameters handlers
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering arguments: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting arguments
   * Validates constructor argument lists
   */
  exitArguments(ctx: ArgumentsContext): void {
    try {
      // Validate argument lists
      // Additional validation can be added here if needed
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting arguments: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering an array initializer
   * Validates array initialization
   */
  enterArrayInitializer(ctx: ArrayInitializerContext): void {
    try {
      // Array initialization tracking can be added here
      // The structure is: LBRACE (expression (COMMA expression)* (COMMA)? )? RBRACE
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering array initializer: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting an array initializer
   * Validates array initialization and tracks array elements
   */
  exitArrayInitializer(ctx: ArrayInitializerContext): void {
    try {
      // Validate array initialization
      // Additional validation can be added here if needed
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error exiting array initializer: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a literal
   * Captures literal values and types for semantic analysis
   */
  enterLiteral(ctx: LiteralContext): void {
    try {
      const location = this.getLocation(ctx);
      let literalValue: string | number | boolean | null = null;
      let literalType:
        | 'Integer'
        | 'Long'
        | 'Decimal'
        | 'String'
        | 'Boolean'
        | 'Null' = 'Null';

      // Extract literal value and determine type
      if (ctx.IntegerLiteral()) {
        const text = ctx.IntegerLiteral()!.text;
        literalValue = parseInt(text, 10);
        literalType = 'Integer';
      } else if (ctx.LongLiteral()) {
        const text = ctx.LongLiteral()!.text;
        // Remove 'L' or 'l' suffix
        const numText = text.replace(/[Ll]$/, '');
        literalValue = parseInt(numText, 10);
        literalType = 'Long';
      } else if (ctx.NumberLiteral()) {
        const text = ctx.NumberLiteral()!.text;
        literalValue = parseFloat(text);
        literalType = 'Decimal';
      } else if (ctx.StringLiteral()) {
        const text = ctx.StringLiteral()!.text;
        // Remove surrounding quotes
        literalValue = text.slice(1, -1);
        literalType = 'String';
      } else if (ctx.BooleanLiteral()) {
        const text = ctx.BooleanLiteral()!.text.toLowerCase();
        literalValue = text === 'true';
        literalType = 'Boolean';
      } else if (ctx.NULL()) {
        literalValue = null;
        literalType = 'Null';
      }

      // Create symbol reference with LITERAL context
      const literalReference: SymbolReference = {
        name: String(literalValue ?? 'null'),
        location,
        context: ReferenceContext.LITERAL,
        literalValue,
        literalType,
      };

      this.symbolTable.addTypeReference(literalReference);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering literal: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a thisPrimary expression
   * Handles THIS keyword directly
   */
  enterThisPrimary(ctx: ThisPrimaryContext): void {
    try {
      const location = this.getLocation(ctx);
      const thisReference = SymbolReferenceFactory.createVariableUsageReference(
        'this',
        location,
      );
      this.symbolTable.addTypeReference(thisReference);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering thisPrimary: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when entering a superPrimary expression
   * Handles SUPER keyword directly
   */
  enterSuperPrimary(ctx: SuperPrimaryContext): void {
    try {
      const location = this.getLocation(ctx);
      const superReference =
        SymbolReferenceFactory.createVariableUsageReference('super', location);
      this.symbolTable.addTypeReference(superReference);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error entering superPrimary: ${errorMessage}`, ctx);
    }
  }

  /**
   * Capture assignment expression references
   * This captures both left-hand and right-hand side of assignments
   */
  enterAssignExpression(ctx: AssignExpressionContext): void {
    // Decide LHS access (readwrite for compound ops, else write)
    const isCompound = !!(
      ctx.ADD_ASSIGN() ||
      ctx.SUB_ASSIGN() ||
      ctx.MUL_ASSIGN() ||
      ctx.DIV_ASSIGN() ||
      ctx.AND_ASSIGN() ||
      ctx.OR_ASSIGN() ||
      ctx.XOR_ASSIGN() ||
      ctx.LSHIFT_ASSIGN() ||
      ctx.RSHIFT_ASSIGN() ||
      ctx.URSHIFT_ASSIGN()
    );
    const lhsAccess: 'write' | 'readwrite' = isCompound ? 'readwrite' : 'write';

    const leftExpression = ctx.expression(0);
    if (leftExpression) {
      const lhsLoc = this.getLocation(leftExpression);
      const parentContext = this.getCurrentMethodName();

      // Suppress child captures within LHS range
      this.suppressAssignmentLHS = true;
      this.suppressedLHSRange = lhsLoc;

      // If it's a simple identifier, mark as write/readwrite
      if (isContextType(leftExpression, PrimaryExpressionContext)) {
        // Extract identifiers to handle array expressions correctly
        // For array expressions like "arr[0]", extractIdentifiersFromExpression returns ["arr"]
        const identifiers =
          this.extractIdentifiersFromExpression(leftExpression);
        if (identifiers.length > 0) {
          // Use the first identifier (for array expressions, this is the base variable)
          const varRef = SymbolReferenceFactory.createVariableUsageReference(
            identifiers[0],
            lhsLoc,
            parentContext,
            lhsAccess,
          );
          this.symbolTable.addTypeReference(varRef);
        }
        return;
      }

      // If it's a dotted field reference: obj.field
      if (isContextType(leftExpression, DotExpressionContext)) {
        const dotExpr = leftExpression;
        const anyId = dotExpr.anyId();
        if (anyId) {
          const fieldName = this.getTextFromContext(anyId);
          const objectExpr = dotExpr.expression();
          if (objectExpr) {
            // Extract identifiers from object expression (handles obj.field[0] cases)
            const objectIdentifiers =
              this.extractIdentifiersFromExpression(objectExpr);
            const objLocation = lhsLoc;
            // Create read references for each identifier in the object expression
            for (const objectName of objectIdentifiers) {
              const objRef =
                SymbolReferenceFactory.createVariableUsageReference(
                  objectName,
                  objLocation,
                  parentContext,
                  'read',
                );
              this.symbolTable.addTypeReference(objRef);
            }
            // field write/readwrite
            const fieldRef = SymbolReferenceFactory.createFieldAccessReference(
              fieldName,
              lhsLoc,
              objectIdentifiers[0] || 'unknown',
              parentContext,
              lhsAccess,
            );
            this.symbolTable.addTypeReference(fieldRef);
            return;
          }
        }
      }

      // If it's an array expression: arr[i] or obj.field[0]
      // Let child listeners (enterArrayExpression) capture the reads
      // They will use extractIdentifiersFromExpression to properly extract identifiers
      if (isContextType(leftExpression, ArrayExpressionContext)) {
        // Child listener will handle this correctly
        return;
      }

      // For other complex LHS, we avoid emitting flattened refs; let child listeners capture reads
    }
  }

  /**
   * Cleanup suppression state after assignment expression
   */
  exitAssignExpression(): void {
    this.suppressAssignmentLHS = false;
    this.suppressedLHSRange = null;
  }

  /**
   * Recursively extract identifiers from an expression context
   * Handles all expression types: IdPrimary, DotExpression, ArrayExpression, MethodCall, CastExpression
   * @param expression The expression context (can be any ParserRuleContext that represents an expression)
   * @returns Array of identifier names extracted from the expression
   */
  private extractIdentifiersFromExpression(
    expression: ParserRuleContext | null | undefined,
  ): string[] {
    if (!expression) return [];

    // Handle IdPrimaryContext (simple identifier)
    if (isContextType(expression, IdPrimaryContext)) {
      const idPrimary = expression;
      const idNode = idPrimary.id();
      if (idNode) {
        return [idNode.text];
      }
      return [];
    }

    // Handle DotExpressionContext (obj.field or obj.method())
    if (isContextType(expression, DotExpressionContext)) {
      const dotExpression = expression;
      const baseExpression = dotExpression.expression();
      const baseIds = this.extractIdentifiersFromExpression(baseExpression);

      // Extract field/method name from anyId or dotMethodCall
      const anyId = dotExpression.anyId?.();
      if (anyId) {
        return [...baseIds, anyId.text];
      }

      const dotMethodCall = dotExpression.dotMethodCall?.();
      if (dotMethodCall) {
        const methodId = dotMethodCall.anyId?.();
        if (methodId) {
          return [...baseIds, methodId.text];
        }
      }

      return baseIds;
    }

    // Handle ArrayExpressionContext (recursively extract from base expression)
    if (isContextType(expression, ArrayExpressionContext)) {
      const arrayExpression = expression;
      const baseExpression = arrayExpression.expression(0);
      // Recursively extract from base, ignoring the index
      return this.extractIdentifiersFromExpression(baseExpression);
    }

    // Handle MethodCallExpressionContext
    if (isContextType(expression, MethodCallExpressionContext)) {
      const methodCall = expression;
      const methodCallCtx = methodCall.methodCall?.();
      if (methodCallCtx) {
        const idNode = methodCallCtx.id();
        if (idNode) {
          return [idNode.text];
        }
      }
      return [];
    }

    // Handle CastExpressionContext
    if (isContextType(expression, CastExpressionContext)) {
      const castExpression = expression;
      const expr = castExpression.expression();
      return this.extractIdentifiersFromExpression(expr);
    }

    // Handle PrimaryExpressionContext - check its child
    if (isContextType(expression, PrimaryExpressionContext)) {
      const primaryExpr = expression;
      // PrimaryExpressionContext contains a primary() method that returns the actual primary
      const primary = primaryExpr.primary?.();
      if (primary) {
        // Check for THIS keyword
        const thisToken = (primary as any).THIS?.();
        if (thisToken) {
          return ['this'];
        }

        // Check for IdPrimaryContext
        if (isContextType(primary, IdPrimaryContext)) {
          return this.extractIdentifiersFromExpression(primary);
        }
      }
      // Could also contain other primary types, but we only care about identifiers
      return [];
    }

    // For other expression types (literals, etc.), return empty array
    return [];
  }

  /**
   * Capture array expression references
   * This captures array access like "myArray[index]"
   */
  enterArrayExpression(ctx: ArrayExpressionContext): void {
    // Extract identifiers from the array base expression
    const arrayExpression = ctx.expression(0);
    if (arrayExpression) {
      const identifiers =
        this.extractIdentifiersFromExpression(arrayExpression);

      // Create individual VARIABLE_USAGE references for each identifier
      // (NOT ChainedSymbolReference - array access uses individual references)
      for (const identifier of identifiers) {
        const location = this.getLocation(arrayExpression);
        const parentContext = this.getCurrentMethodName();

        const reference = SymbolReferenceFactory.createVariableUsageReference(
          identifier,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(reference);
      }
    }

    // Extract identifiers from the index expression if it contains variables
    const indexExpression = ctx.expression(1);
    if (indexExpression) {
      const indexIdentifiers =
        this.extractIdentifiersFromExpression(indexExpression);

      // Create VARIABLE_USAGE references for index variables (e.g., arr[i])
      for (const identifier of indexIdentifiers) {
        const location = this.getLocation(indexExpression);
        const parentContext = this.getCurrentMethodName();

        const reference = SymbolReferenceFactory.createVariableUsageReference(
          identifier,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(reference);
      }
    }
  }

  /**
   * Capture cast expression references
   * This captures type casting like "(String) myVariable"
   */
  enterCastExpression(ctx: CastExpressionContext): void {
    // Capture the type being cast to
    const typeRef = ctx.typeRef();
    if (typeRef) {
      const typeName = this.getTextFromContext(typeRef);
      const location = this.getLocation(typeRef);
      const parentContext = this.getCurrentMethodName();

      // Use the new CAST_TYPE_REFERENCE context for cast types
      const reference = SymbolReferenceFactory.createCastTypeReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
    }

    // Capture the expression being cast
    const expression = ctx.expression();
    if (expression) {
      // Extract identifiers from the expression (handles all complexity)
      const identifiers = this.extractIdentifiersFromExpression(expression);

      // Create VARIABLE_USAGE references for each identifier found
      for (const identifier of identifiers) {
        const location = this.getLocation(expression);
        const parentContext = this.getCurrentMethodName();

        const reference = SymbolReferenceFactory.createVariableUsageReference(
          identifier,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(reference);
      }
    }
  }

  /**
   * Capture exception type in catch clauses: catch (QualifiedName e)
   * Also creates scope for the catch block
   */
  enterCatchClause(ctx: CatchClauseContext): void {
    try {
      // Capture exception type reference
      const qn: QualifiedNameContext | undefined = ctx.qualifiedName?.();
      if (qn) {
        const typeName = this.getTextFromContext(qn);
        const location = this.getLocation(qn as unknown as ParserRuleContext);
        const parentContext = this.getCurrentMethodName();
        const classRef = SymbolReferenceFactory.createClassReference(
          typeName,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(classRef);
      }

      // Create scope for catch block
      const name = this.generateBlockName('catch');
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol();
      const blockSymbol = this.createBlockSymbol(
        name,
        'catch',
        location,
        parentScope,
      );

      // Push block symbol onto stack (blockSymbol should never be null from enterScope)
      if (!blockSymbol) {
        this.addError('Failed to create block symbol', ctx);
        return;
      }
      // Push block symbol onto stack
      this.scopeStack.push(blockSymbol);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in catch clause: ${errorMessage}`, ctx);
    }
  }

  /**
   * Called when exiting a catch clause
   */
  exitCatchClause(): void {
    // No-op - stack handles scope exit
    // this.symbolTable.exitScope(); // Removed - stack handles scope exit

    // Pop from stack and validate it's a catch scope
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== 'catch') {
        this.logger.warn(
          `Expected catch scope on exitCatchClause, but got ${popped.scopeType}`,
        );
      }
    }
  }

  /**
   * Capture enhanced-for variable type and source collection usage
   * for (typeRef id : expression)
   */
  enterEnhancedForControl(ctx: EnhancedForControlContext): void {
    try {
      const typeRef = ctx.typeRef?.();
      if (typeRef) {
        const typeName = this.getTextFromContext(typeRef);
        const location = this.getLocation(typeRef);
        const parentContext = this.getCurrentMethodName();
        const paramRef = SymbolReferenceFactory.createParameterTypeReference(
          typeName,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(paramRef);
      }

      const expr = ctx.expression?.();
      if (expr) {
        // Extract identifiers to handle array expressions correctly
        // For array expressions like "arr[0]", extractIdentifiersFromExpression returns ["arr"]
        const identifiers = this.extractIdentifiersFromExpression(expr);
        for (const identifier of identifiers) {
          const location = this.getLocation(expr);
          const parentContext = this.getCurrentMethodName();
          const usageRef = SymbolReferenceFactory.createVariableUsageReference(
            identifier,
            location,
            parentContext,
          );
          this.symbolTable.addTypeReference(usageRef);
        }
      }
    } catch (e) {
      this.logger.warn(() => `Error capturing enhanced for control: ${e}`);
    }
  }

  /**
   * Extract type name and location from a TypeRefContext
   * Handles LIST/SET/MAP tokens, qualified names, and regular identifiers
   * Same logic as used in enterTypeRef() for consistent processing
   */
  private extractTypeNameFromTypeRef(
    typeRef: TypeRefContext,
  ): { fullTypeName: string; baseLocation: SymbolLocation } | null {
    const typeNames = typeRef.typeName();
    if (!typeNames || typeNames.length === 0) return null;

    // For qualified type names (e.g., System.Url), we need to combine all type names
    let fullTypeName: string;
    let baseLocation: SymbolLocation | undefined;

    if (typeNames.length > 1) {
      // This is a qualified type name like System.Url
      const typeNameParts = typeNames.map((tn) => {
        const id = tn.id();
        if (id) {
          return id.text;
        } else {
          // Handle collection types (LIST/SET/MAP tokens)
          return `${tn.LIST() || tn.SET() || tn.MAP()}`;
        }
      });
      fullTypeName = typeNameParts.join('.');
      baseLocation = this.getLocationForReference(typeNames[0]);
    } else {
      // Single type name
      const typeName = typeNames[0];
      if (!typeName) return null;

      const baseTypeId = typeName.id();
      if (baseTypeId) {
        // Regular identifier case: id typeArguments?
        fullTypeName = baseTypeId.text;
        baseLocation = this.getLocationForReference(baseTypeId);
      } else {
        // Collection type case: LIST/SET/MAP typeArguments?
        fullTypeName = `${typeName.LIST() || typeName.SET() || typeName.MAP()}`;
        baseLocation = this.getLocationForReference(typeName);
      }
    }

    if (!fullTypeName || !baseLocation) return null;

    return { fullTypeName, baseLocation };
  }

  /**
   * Handle generic type arguments (e.g., <String, List<System.Url>>)
   * This method is called when entering a typeArguments context
   * Generic arguments are processed the same way as typeName.id (Java-style generics)
   */
  enterTypeArguments(ctx: TypeArgumentsContext): void {
    try {
      // Process each type reference in the generic arguments
      const typeList = ctx.typeList();
      if (typeList) {
        const typeRefs = typeList.typeRef();

        // Process each type reference as a generic parameter
        for (const typeRef of typeRefs) {
          // Extract type name using the same logic as enterTypeRef()
          // This handles LIST/SET/MAP tokens, qualified names, and regular identifiers
          const extracted = this.extractTypeNameFromTypeRef(typeRef);
          if (!extracted) continue;

          const { fullTypeName, baseLocation } = extracted;
          const parentContext = this.determineTypeReferenceContext(typeRef);

          // Check if we already have a reference for this generic type at the same location
          if (
            this.hasExistingTypeReferenceAtLocation(
              fullTypeName,
              baseLocation,
              parentContext,
              ReferenceContext.GENERIC_PARAMETER_TYPE,
            )
          ) {
            continue;
          }

          // Create GENERIC_PARAMETER_TYPE reference for generic type arguments
          // Generic type arguments should only use GENERIC_PARAMETER_TYPE, not PARAMETER_TYPE or RETURN_TYPE
          const genericReference =
            SymbolReferenceFactory.createGenericParameterTypeReference(
              fullTypeName,
              baseLocation,
              parentContext,
            );
          this.symbolTable.addTypeReference(genericReference);
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in type arguments: ${errorMessage}`, ctx);
    }
  }

  /**
   * Handle exit of generic type arguments
   * This method is called when exiting a typeArguments context
   * TODO: may not be needed
   */
  exitTypeArguments(ctx: TypeArgumentsContext): void {}

  /**
   * Handle typeList contexts
   * typeList appears in multiple places:
   * 1. typeArguments (LT typeList GT) - handled by enterTypeArguments, skip here
   * 2. idCreatedNamePair (anyId (LT typeList GT)?) - constructor calls, use GENERIC_PARAMETER_TYPE
   * 3. IMPLEMENTS/EXTENDS - interface declarations, use TYPE_DECLARATION
   */
  enterTypeList(ctx: TypeListContext): void {
    try {
      // Check if we're inside typeArguments - if so, let enterTypeArguments handle it
      let current: any = ctx.parent;
      while (current) {
        if (isContextType(current, TypeArgumentsContext)) {
          // enterTypeArguments will handle this, skip here
          return;
        }
        // Check if we're in a constructor call (idCreatedNamePair)
        // idCreatedNamePair is used in createdName, which is used in creator, which is used in newExpression
        if (isContextType(current, NewExpressionContext)) {
          // This is a constructor call - create GENERIC_PARAMETER_TYPE references
          this.processTypeListForConstructorCall(ctx);
          return;
        }
        // Check for IMPLEMENTS/EXTENDS contexts
        if (isTypeDeclarationContext(current)) {
          // Handle interface implementations/extensions
          this.processTypeListForInterfaceDeclaration(ctx);
          return;
        }
        current = current.parent;
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in type list: ${errorMessage}`, ctx);
    }
  }

  /**
   * Process typeList for constructor calls - creates GENERIC_PARAMETER_TYPE references
   * These are generic type arguments (e.g., String in new List<String>()), not formal parameters
   */
  private processTypeListForConstructorCall(ctx: TypeListContext): void {
    const typeRefs = ctx.typeRef();
    const parentContext = this.getCurrentMethodName();

    for (const typeRef of typeRefs) {
      const extracted = this.extractTypeNameFromTypeRef(typeRef);
      if (!extracted) continue;

      const { fullTypeName, baseLocation } = extracted;

      // Check if we already have a reference for this type at the same location
      if (
        this.hasExistingTypeReferenceAtLocation(
          fullTypeName,
          baseLocation,
          parentContext,
          ReferenceContext.GENERIC_PARAMETER_TYPE,
        )
      ) {
        continue;
      }

      // For constructor calls, use GENERIC_PARAMETER_TYPE (not PARAMETER_TYPE)
      // These are generic type arguments, not formal method/constructor parameters
      const genericRef =
        SymbolReferenceFactory.createGenericParameterTypeReference(
          fullTypeName,
          baseLocation,
          parentContext,
        );
      this.symbolTable.addTypeReference(genericRef);
    }
  }

  /**
   * Process typeList for interface declarations (IMPLEMENTS/EXTENDS)
   */
  private processTypeListForInterfaceDeclaration(ctx: TypeListContext): void {
    const typeRefs = ctx.typeRef();
    const parentContext = this.getCurrentType()?.name;

    for (const typeRef of typeRefs) {
      const extracted = this.extractTypeNameFromTypeRef(typeRef);
      if (!extracted) continue;

      const { fullTypeName, baseLocation } = extracted;

      // For interface declarations, use TYPE_DECLARATION
      const typeRefObj = SymbolReferenceFactory.createTypeDeclarationReference(
        fullTypeName,
        baseLocation,
        parentContext,
      );
      this.symbolTable.addTypeReference(typeRefObj);
    }
  }

  /**
   * Handle type name contexts (LIST, SET, MAP, or id with optional typeArguments)
   * This method is called when entering a typeName context
   * TODO: may not be needed
   */
  enterTypeName(ctx: TypeNameContext): void {
    // nothing to do
  }

  /**
   * Handle exit of type name context
   * This method is called when exiting a typeName context
   * TODO: may not be needed
   */
  exitTypeName(ctx: TypeNameContext): void {
    // nothing to do
  }

  /**
   * Capture type literals like: TypeName.class
   */
  enterTypeRefPrimary(ctx: TypeRefPrimaryContext): void {
    try {
      const tr = ctx.typeRef?.();
      if (!tr) return;
      const typeName = this.getTextFromContext(tr);
      const location = this.getLocation(tr);
      const parentContext = this.getCurrentMethodName();

      // Use CLASS_REFERENCE for type literals like TypeName.class
      const classRef = SymbolReferenceFactory.createClassReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(classRef);
    } catch (e) {
      this.logger.warn(() => `Error capturing typeRefPrimary: ${e}`);
    }
  }

  /**
   * Capture instanceof expression type references
   * This captures the type in expressions like "obj instanceof String"
   */
  enterInstanceOfExpression(ctx: InstanceOfExpressionContext): void {
    try {
      const typeRefCtx = ctx.typeRef?.();
      if (!typeRefCtx) return;
      const typeName = this.getTextFromContext(typeRefCtx);
      const location = this.getLocation(typeRefCtx);
      const parentContext = this.getCurrentMethodName();

      // Use the new INSTANCEOF_TYPE_REFERENCE context for instanceof types
      const typeRef = SymbolReferenceFactory.createInstanceOfTypeReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(typeRef);
    } catch (e) {
      this.logger.warn(() => `Error capturing instanceof expression: ${e}`);
    }
  }

  /**
   * Add a reference to the current method call's parameter list if we're collecting parameters
   * This is called when creating references that could be method call parameters.
   * Only adds if we're actually in an ExpressionListContext (method/constructor parameters).
   */
  private addToCurrentMethodParameters(ref: SymbolReference): void {
    // Only add if there's a method call on the stack (we're collecting parameters)
    if (this.methodCallStack.size > 0) {
      const currentEntry = this.methodCallStack.peek();
      if (currentEntry) {
        currentEntry.parameterRefs.push(ref);
      }
    }
  }

  /**
   * Check if ExpressionListContext is within a method or constructor call
   * ExpressionList can appear in multiple contexts:
   * - Method calls: MethodCallContext, DotMethodCallContext (track parameters)
   * - Constructor calls: NewExpressionContext → creator → classCreatorRest → arguments (track arguments)
   * - For loops: ForStatementContext → forControl → forInit/forUpdate (do NOT track as method parameters)
   * - RunAs statement: RunAsStatementContext (do NOT track as method parameters)
   */
  private isInMethodOrConstructorCall(ctx: ExpressionListContext): boolean {
    const parent = ctx.parent;
    if (!parent) return false;

    // First check: exclude cases where ExpressionList is NOT in a method/constructor call
    // ExpressionList can be a direct child of ForStatementContext (via forInit/forUpdate)
    // or RunAsStatementContext
    if (
      isContextType(parent, ForStatementContext) ||
      isContextType(parent, RunAsStatementContext)
    ) {
      return false;
    }

    // Second check: direct parent is MethodCallContext or DotMethodCallContext
    if (
      isContextType(parent, MethodCallContext) ||
      isContextType(parent, DotMethodCallContext)
    ) {
      return true;
    }

    // Third check: walk up parent chain to find constructor call
    // ExpressionList → arguments → classCreatorRest → creator → NewExpressionContext
    let current: ParserRuleContext | undefined = parent;
    while (current) {
      // If we hit ForStatementContext or RunAsStatementContext, we're not in a method/constructor call
      if (
        isContextType(current, ForStatementContext) ||
        isContextType(current, RunAsStatementContext)
      ) {
        return false;
      }

      // Check if we're in a constructor call
      if (isContextType(current, NewExpressionContext)) {
        const newExpr = current as unknown as NewExpressionContext;
        const creator = (newExpr as any).creator?.();
        if (creator) {
          const classCreatorRest = (creator as any).classCreatorRest?.();
          if (classCreatorRest) {
            // This is a constructor call with arguments
            return true;
          }
        }
        // Found NewExpressionContext but no classCreatorRest, so not a constructor call with arguments
        return false;
      }

      current = current.parent as ParserRuleContext | undefined;
    }

    return false;
  }

  /**
   * Called when entering an expression list (method parameters, constructor arguments, etc.)
   * This handles nested expressions in method calls like a.b.c(x.y.z())
   *
   * The methodCallStack should already have the current method/constructor call on top
   * when this is called for method/constructor parameters. This is because:
   * - enterMethodCall/enterDotMethodCall push onto methodCallStack before ExpressionListContext
   * - enterNewExpression (for constructors) pushes onto methodCallStack before ExpressionListContext
   *
   * Parameter references are collected via addToCurrentMethodParameters() when individual
   * expressions (field access, variable usage, nested method calls) are processed.
   *
   * Note: This method does NOT activate for for loops or runAs statements - those use
   * ExpressionListContext but are not method/constructor calls.
   */
  enterExpressionList(ctx: ExpressionListContext): void {
    // If we're entering a method/constructor call's parameter list and there's an active chain scope,
    // we need to finalize it before processing parameters. This ensures that chains in parameters
    // (like URL.getOrgDomainUrl().toExternalForm()) start fresh and don't get merged with the
    // parent method call's chain (like request.setHeader).
    if (
      this.isInMethodOrConstructorCall(ctx) &&
      this.chainExpressionScope?.isActive
    ) {
      // Finalize the current chain scope (e.g., request.setHeader)
      this.finalizeChainScope(this.chainExpressionScope);
      // Clear the scope so parameters start with a clean slate
      this.chainExpressionScope = null;
    }
  }

  /**
   * Called when exiting an expression list
   *
   * Parameter references are already associated with method calls via the stack.
   * No cleanup needed - the method call will be popped when exitMethodCall/exitDotMethodCall
   * or exitNewExpression is called.
   */
  exitExpressionList(ctx: ExpressionListContext): void {
    // Parameter references are already associated with method calls via the stack
    // No cleanup needed - the method call will be popped when exitMethodCall/exitDotMethodCall
    // or exitNewExpression is called
  }

  /**
   * Called when entering a for loop initialization
   */
  enterForInit(ctx: any): void {
    // The parser will automatically call enterLocalVariableDeclaration for any
    // localVariableDeclaration child, so we don't need to process it here manually
    // Note: If it's an expressionList (e.g., "i = 0"), we don't need to process it
    // as a variable declaration since it's just an assignment to an existing variable
  }

  /**
   * Add an error to the error list TODO: may not be needed
   */
  addError(message: string, ctx: ParserRuleContext): void {
    const error: SemanticError = {
      type: 'semantic',
      severity: 'error',
      message,
      line: ctx.start.line,
      column: ctx.start.charPositionInLine,
      fileUri: this.currentFilePath,
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
      fileUri: this.currentFilePath,
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
      isBuiltIn: false,
    };
  }

  /**
   * Reset modifiers to defaults
   */
  /**
   * Get parent symbol using parentId lookup from SymbolTable
   * @param symbol The symbol to get the parent for
   * @returns The parent symbol if found, null otherwise
   */
  private getParent(symbol: ApexSymbol): ApexSymbol | null {
    if (!symbol.parentId) {
      return null;
    }
    return (
      this.symbolTable.findSymbolWith((s) => s.id === symbol.parentId) || null
    );
  }

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
   * Process a local variable declaration (extracted from statement)
   */
  private processLocalVariableDeclaration(ctx: any): void {
    try {
      const modifiers = this.getCurrentModifiers();
      this.resetModifiers();

      // Extract type reference and variable declarators from children
      // The structure is: modifier* typeRef variableDeclarators
      let typeRefChild: any = null;
      let variableDeclaratorsChild: any = null;

      // Find the typeRef and variableDeclarators children
      for (const child of ctx.children || []) {
        if (child.constructor.name === 'TypeRefContext') {
          typeRefChild = child;
        } else if (child.constructor.name === 'VariableDeclaratorsContext') {
          variableDeclaratorsChild = child;
        }
      }

      // Get the type using parser structure for accurate generic type extraction
      // Pass the localVariableDeclaration context so we can link to the TYPE_DECLARATION reference
      const varType = typeRefChild
        ? this.createTypeInfoFromTypeRef(typeRefChild as TypeRefContext, ctx)
        : createTypeInfo('Object');

      // Process each variable declared
      if (variableDeclaratorsChild) {
        const variableDeclarators =
          variableDeclaratorsChild.variableDeclarator();

        // Collect all variable names in this statement for duplicate checking within the statement
        const statementVariableNames = new Set<string>();

        for (const declarator of variableDeclarators) {
          const name = declarator.id()?.text ?? 'unknownVariable';

          // Check for duplicate variable names within the same statement
          if (statementVariableNames.has(name)) {
            this.addError(
              `Duplicate variable declaration: '${name}' is already declared in this statement`,
              declarator,
            );
            continue; // Skip processing this duplicate variable
          }
          statementVariableNames.add(name);

          // Check for duplicate variable declaration in the current scope (from previous statements)
          const existingSymbol = this.symbolTable.findSymbolInCurrentScope(
            name,
            this.getCurrentScopeSymbol(),
          );
          if (existingSymbol) {
            this.addError(
              `Duplicate variable declaration: '${name}' is already declared in this scope`,
              declarator,
            );
            continue; // Skip processing this duplicate variable
          }

          // Always process the variable in the current scope
          this.processVariableDeclarator(
            declarator,
            varType,
            modifiers,
            SymbolKind.Variable,
          );
        }
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
   * Process a variable declarator
   */
  private processVariableDeclarator(
    ctx: VariableDeclaratorContext,
    type: TypeInfo,
    modifiers: SymbolModifiers,
    kind: SymbolKind.Field | SymbolKind.Variable | SymbolKind.EnumValue,
  ): void {
    try {
      const name = ctx.id()?.text ?? 'unknownVariable';

      // Validate identifier
      const validationResult = IdentifierValidator.validateIdentifier(
        name,
        kind,
        false, // Variables are never top-level
        this.createValidationScope(),
      );

      if (!validationResult.isValid) {
        validationResult.errors.forEach((error) => {
          this.addError(error, ctx);
        });
      }

      const variableSymbol = this.createVariableSymbol(
        ctx,
        modifiers,
        name,
        kind,
        type,
      );

      this.symbolTable.addSymbol(variableSymbol, this.getCurrentScopeSymbol());

      // Create VARIABLE_DECLARATION reference for the variable/field declaration
      const identifierLocation = this.getIdentifierLocation(ctx);
      const parentContext = this.getCurrentScopeSymbol()?.name;
      const variableDeclarationRef =
        SymbolReferenceFactory.createVariableDeclarationReference(
          name,
          identifierLocation,
          parentContext,
        );
      this.symbolTable.addTypeReference(variableDeclarationRef);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.addError(`Error in variable: ${errorMessage}`, ctx);
    }
  }

  /**
   * Get location information from a context
   * symbolRange covers the entire context, identifierRange covers just the identifier
   */
  private getLocation(ctx: ParserRuleContext): SymbolLocation {
    const fullRange = {
      startLine: ctx.start.line, // Use native ANTLR 1-based line numbers
      startColumn: ctx.start.charPositionInLine, // Both use 0-based columns
      endLine: ctx.stop?.line ?? ctx.start.line, // Use native ANTLR 1-based line numbers
      endColumn:
        (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
        (ctx.stop?.text?.length ?? 0),
    };

    // Get identifier range using parser's direct access methods
    const identifierRange = this.getIdentifierRange(ctx) || fullRange;

    return {
      symbolRange: fullRange,
      identifierRange: identifierRange,
    };
  }

  /**
   * Get precise location information for just the identifier (name)
   * This excludes any surrounding context like keywords, modifiers, etc.
   *
   * @param ctx The parser context containing the identifier
   * @returns The precise location of the identifier
   */
  private getIdentifierLocation(ctx: ParserRuleContext): SymbolLocation {
    const identifierRange = this.getIdentifierRange(ctx);

    if (identifierRange) {
      return {
        symbolRange: identifierRange, // For identifier-only contexts, both ranges are the same
        identifierRange: identifierRange,
      };
    }

    // Fallback to full context location
    return this.getLocation(ctx);
  }

  /**
   * Extract the precise range of the identifier from a parser context
   * Uses ANTLR's direct access methods for accurate positioning
   */
  private getIdentifierRange(ctx: ParserRuleContext): Range | null {
    // Strategy 1: Check if the context has an id() method (most common case)
    if (hasIdMethod(ctx)) {
      const identifierNode = ctx.id();
      if (identifierNode?.start && identifierNode?.stop) {
        return {
          startLine: identifierNode.start.line,
          startColumn: identifierNode.start.charPositionInLine,
          endLine: identifierNode.stop.line,
          endColumn:
            identifierNode.stop.charPositionInLine +
            (identifierNode.stop.text?.length ?? 0),
        };
      }
    }

    // Strategy 2: Check for LIST/SET/MAP tokens in TypeNameContext
    // These are reserved keywords that need special handling
    // TypeNameContext has LIST(), SET(), MAP() methods that return TerminalNode
    if (isContextType(ctx, TypeNameContext)) {
      const typeNameCtx = ctx as TypeNameContext;
      const listToken = typeNameCtx.LIST?.();
      if (listToken) {
        // TerminalNode has symbol property which is a Token
        const token = (listToken as any).symbol || listToken;
        const text = token?.text || listToken?.text || 'List';
        const startCol =
          token?.charPositionInLine ?? ctx.start.charPositionInLine;
        return {
          startLine: token?.line ?? ctx.start.line,
          startColumn: startCol,
          endLine: token?.line ?? ctx.start.line,
          endColumn: startCol + text.length,
        };
      }
      const setToken = typeNameCtx.SET?.();
      if (setToken) {
        const token = (setToken as any).symbol || setToken;
        const text = token?.text || setToken?.text || 'Set';
        const startCol =
          token?.charPositionInLine ?? ctx.start.charPositionInLine;
        return {
          startLine: token?.line ?? ctx.start.line,
          startColumn: startCol,
          endLine: token?.line ?? ctx.start.line,
          endColumn: startCol + text.length,
        };
      }
      const mapToken = typeNameCtx.MAP?.();
      if (mapToken) {
        const token = (mapToken as any).symbol || mapToken;
        const text = token?.text || mapToken?.text || 'Map';
        const startCol =
          token?.charPositionInLine ?? ctx.start.charPositionInLine;
        return {
          startLine: token?.line ?? ctx.start.line,
          startColumn: startCol,
          endLine: token?.line ?? ctx.start.line,
          endColumn: startCol + text.length,
        };
      }
    }

    // Strategy 3: Check for qualifiedName context (e.g., constructor names)
    if ('qualifiedName' in ctx && typeof ctx.qualifiedName === 'function') {
      const qn = ctx.qualifiedName();
      if (qn?.id && qn.id().length > 0) {
        const lastId = qn.id()[qn.id().length - 1]; // Get the last identifier in qualified name
        if (lastId?.start && lastId?.stop) {
          return {
            startLine: lastId.start.line,
            startColumn: lastId.start.charPositionInLine,
            endLine: lastId.stop.line,
            endColumn:
              lastId.stop.charPositionInLine + (lastId.stop.text?.length ?? 0),
          };
        }
      }
    }

    // Strategy 4: Check for anyId context (e.g., field access)
    if ('anyId' in ctx && typeof ctx.anyId === 'function') {
      const anyId = ctx.anyId();
      if (anyId?.start && anyId?.stop) {
        return {
          startLine: anyId.start.line,
          startColumn: anyId.start.charPositionInLine,
          endLine: anyId.stop.line,
          endColumn:
            anyId.stop.charPositionInLine + (anyId.stop.text?.length ?? 0),
        };
      }
    }

    return null;
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
    const typeRef = ctx.typeRef();
    if (typeRef) {
      return this.createTypeInfoFromTypeRef(typeRef);
    }
    // Handle VOID case
    return createPrimitiveType('void');
  }

  /**
   * Create a TypeInfo object from a type string
   * Uses createTypeInfo for comprehensive namespace resolution
   */
  private createTypeInfo(typeString: string): TypeInfo {
    return createTypeInfo(typeString);
  }

  /**
   * Extract TypeInfo from TypeRefContext using parser structure
   * This provides more accurate type information than string parsing
   * @param typeRef The TypeRefContext to extract type info from
   * @param localVarDeclContext Optional localVariableDeclaration context for linking to TYPE_DECLARATION reference
   * @returns TypeInfo object with proper structure including typeParameters
   */
  private createTypeInfoFromTypeRef(
    typeRef: TypeRefContext,
    localVarDeclContext?: ParserRuleContext,
  ): TypeInfo {
    const typeNames = typeRef.typeName();
    if (!typeNames || typeNames.length === 0) {
      return createTypeInfo('Object');
    }

    // Get the first typeName (base type)
    const baseTypeName = typeNames[0];
    if (!baseTypeName) {
      return createTypeInfo('Object');
    }

    // Check for collection types (LIST, SET, MAP)
    const listToken = baseTypeName.LIST();
    const setToken = baseTypeName.SET();
    const mapToken = baseTypeName.MAP();

    // Check for generic type arguments
    const typeArguments = baseTypeName.typeArguments();
    const typeList = typeArguments?.typeList();
    const genericTypeRefs = typeList?.typeRef() || [];

    // Extract base type name
    let baseTypeNameStr: string;
    if (listToken) {
      baseTypeNameStr = 'List';
    } else if (setToken) {
      baseTypeNameStr = 'Set';
    } else if (mapToken) {
      baseTypeNameStr = 'Map';
    } else {
      const id = baseTypeName.id();
      if (!id) {
        return createTypeInfo('Object');
      }
      baseTypeNameStr = id.text;
    }

    // Handle qualified type names (e.g., System.Url)
    if (typeNames.length > 1) {
      // For qualified types, we need to build the full qualified name
      const qualifiedParts = typeNames.map((tn) => {
        const tnId = tn.id();
        if (tnId) {
          return tnId.text;
        }
        return `${tn.LIST() || tn.SET() || tn.MAP()}`;
      });
      const qualifiedName = qualifiedParts.join('.');
      // For qualified types with generics, we still use createTypeInfo
      // but it will now extract the base name correctly
      const typeInfo = createTypeInfo(
        typeArguments
          ? `${qualifiedName}<${genericTypeRefs.map((tr) => this.getTextFromContext(tr)).join(', ')}>`
          : qualifiedName,
      );

      // Link to TYPE_DECLARATION reference
      this.linkTypeInfoToReference(
        typeInfo,
        qualifiedName,
        typeRef,
        localVarDeclContext,
      );

      return typeInfo;
    }

    // Handle generic type parameters
    if (genericTypeRefs.length > 0) {
      // Recursively extract type parameters
      const typeParameters = genericTypeRefs.map((tr) =>
        this.createTypeInfoFromTypeRef(tr),
      );

      // Handle Map specially (has keyType and valueType)
      if (mapToken && typeParameters.length >= 2) {
        const typeInfo = createMapTypeInfo(
          typeParameters[0],
          typeParameters[1],
        );
        this.linkTypeInfoToReference(
          typeInfo,
          baseTypeNameStr,
          typeRef,
          localVarDeclContext,
        );
        return typeInfo;
      }

      // Handle List and Set
      if (listToken || setToken) {
        const typeInfo = createCollectionTypeInfo(
          baseTypeNameStr,
          typeParameters,
        );
        this.linkTypeInfoToReference(
          typeInfo,
          baseTypeNameStr,
          typeRef,
          localVarDeclContext,
        );
        return typeInfo;
      }

      // For regular types with generics, create base type with typeParameters
      // Note: This is a simplified approach - full support would require
      // a more sophisticated TypeInfo structure
      const baseTypeInfo = createTypeInfo(baseTypeNameStr);
      const typeInfo = {
        ...baseTypeInfo,
        typeParameters,
        originalTypeString: `${baseTypeNameStr}<${typeParameters.map((tp) => tp.originalTypeString).join(', ')}>`,
      };
      this.linkTypeInfoToReference(
        typeInfo,
        baseTypeNameStr,
        typeRef,
        localVarDeclContext,
      );
      return typeInfo;
    }

    // Check for array subscripts (arrays are handled at typeRef level)
    const arraySubscripts = typeRef.arraySubscripts();
    if (arraySubscripts) {
      // This is an array type - use createTypeInfo which handles arrays via string parsing
      // Arrays are complex because they can be nested: String[][]
      // For now, fall back to string-based parsing for arrays
      const typeInfo = createTypeInfo(this.getTextFromContext(typeRef));
      // For arrays, link to the base type reference (without array brackets)
      this.linkTypeInfoToReference(
        typeInfo,
        baseTypeNameStr,
        typeRef,
        localVarDeclContext,
      );
      return typeInfo;
    }

    // No generics - just create the base type
    const typeInfo = createTypeInfo(baseTypeNameStr);

    // Link the TypeInfo to its TYPE_DECLARATION reference
    this.linkTypeInfoToReference(
      typeInfo,
      baseTypeNameStr,
      typeRef,
      localVarDeclContext,
    );

    return typeInfo;
  }

  /**
   * Link a TypeInfo to its TYPE_DECLARATION reference
   * This allows variables/fields/properties/parameters to have a pointer to their type reference
   *
   * Uses the parser structure: when enterTypeRef is called from within a localVariableDeclaration,
   * we store the reference keyed by the parent localVariableDeclaration context. Then when we
   * process the variable declaration, we can retrieve it using the same context object.
   */
  private linkTypeInfoToReference(
    typeInfo: TypeInfo,
    typeName: string,
    typeRef: TypeRefContext,
    localVarDeclContext?: ParserRuleContext,
  ): void {
    // If we have the localVariableDeclaration context, use it to look up the reference
    if (localVarDeclContext) {
      const typeDeclarationRef =
        this.localVarDeclToTypeRefMap.get(localVarDeclContext);

      if (typeDeclarationRef) {
        // Generate the reference ID from the stored reference
        const refId = `${this.currentFilePath}:${
          typeDeclarationRef.location.identifierRange.startLine
        }:${typeDeclarationRef.location.identifierRange.startColumn}:${
          typeDeclarationRef.name
        }:TYPE_DECLARATION`;
        typeInfo.typeReferenceId = refId;
        this.logger.debug(
          () =>
            `[linkTypeInfoToReference] Linked type "${typeName}" to reference ID: ${refId}`,
        );
        return;
      }
    }

    this.logger.debug(
      () =>
        `[linkTypeInfoToReference] Could not find TYPE_DECLARATION reference for "${typeName}" in WeakMap`,
    );
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
    const parent = this.getParent(symbol);
    if (!parent) {
      return false; // No parent, not an inner class
    }

    // If parent is a block, find the class symbol it belongs to
    if (isBlockSymbol(parent) && parent.scopeType === 'class') {
      // Block's parentId points to the class symbol
      const classSymbol = this.symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            s.id === parent.parentId &&
            (s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum ||
              s.kind === SymbolKind.Trigger),
        );
      return classSymbol !== null && classSymbol !== undefined;
    }

    // If parent is directly a class symbol
    return isClassSymbol(parent);
  }

  /**
   * Check if a symbol is nested within another inner class
   * @param symbol The symbol to check, defaults to the current type symbol if not provided
   * @returns true if the symbol is nested within another inner class, false otherwise
   */
  private isNestedInInnerClass(symbol?: TypeSymbol | null): boolean {
    // Use the provided symbol or fall back to current type symbol
    const symbolToCheck = symbol || this.getCurrentType();

    // If no symbol to check, return false
    if (!symbolToCheck) {
      return false;
    }

    // Check if the symbol is an inner class (has a class parent)
    // If it is, then any class defined within it is nested within an inner class
    return this.hasClassParent(symbolToCheck);
  }

  /**
   * Detect whether a TypeRef node is used as a generic argument (e.g., the String in List<String>)
   * by checking if any ancestor is a TypeList context.
   */
  private isGenericArgument(ctx: TypeRefContext): boolean {
    let current: any = ctx.parent;
    while (current) {
      if (isContextType(current, TypeListContext)) return true;
      // Stop if we climb past the TypeRef owner (another TypeRef or TypeName)
      if (isTypeReferenceContext(current)) {
        // keep climbing; generic arguments are nested under TypeList within TypeName
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Capture constructor call reference from NewExpressionContext using parser structure
   */
  private captureConstructorCallReference(ctx: NewExpressionContext): void {
    try {
      const creator = ctx.creator();
      if (!creator) return;

      const createdName = creator.createdName();
      if (!createdName) return;

      // Handle collection types (List, Set, Map) which are tokens, not identifiers
      // For constructor calls like "new List<Integer>", the parser structure is:
      // createdName -> idCreatedNamePair[0] -> typeName() -> LIST/SET/MAP token
      // OR createdName -> typeName() -> LIST/SET/MAP token (direct)
      let listToken: any = null;
      let setToken: any = null;
      let mapToken: any = null;

      // First, try to get typeName directly from createdName
      let createdNameTypeName = (createdName as any).typeName?.();
      let pairTypeName: any = null;
      if (createdNameTypeName) {
        listToken = createdNameTypeName.LIST?.() || null;
        setToken = createdNameTypeName.SET?.() || null;
        mapToken = createdNameTypeName.MAP?.() || null;
      }

      // If not found, check idCreatedNamePair structure
      if (!listToken && !setToken && !mapToken) {
        const idCreatedNamePairs = createdName.idCreatedNamePair();
        if (idCreatedNamePairs && idCreatedNamePairs.length > 0) {
          const firstPair = idCreatedNamePairs[0];
          pairTypeName = (firstPair as any).typeName?.();
          if (pairTypeName) {
            listToken = pairTypeName.LIST?.() || null;
            setToken = pairTypeName.SET?.() || null;
            mapToken = pairTypeName.MAP?.() || null;
          }
        }
      }

      if (listToken || setToken || mapToken) {
        const collectionType = listToken ? 'List' : setToken ? 'Set' : 'Map';
        const token = listToken || setToken || mapToken;

        // Get the typeName context that contains the token for precise location extraction
        // Use the one where we actually found the token
        const typeNameCtx = createdNameTypeName || pairTypeName;

        // Use getIdentifierRange to get precise location, similar to enterTypeRef
        let location: SymbolLocation;
        if (typeNameCtx) {
          const identifierRange = this.getIdentifierRange(typeNameCtx);
          if (identifierRange) {
            location = {
              symbolRange: identifierRange,
              identifierRange: identifierRange,
            };
          } else {
            // Fallback to token-based location
            const tokenSymbol = (token as any).symbol || token;
            const tokenText =
              tokenSymbol?.text || token?.text || collectionType;
            const tokenLine = tokenSymbol?.line ?? (token as any).line ?? 1;
            const tokenStartCol =
              tokenSymbol?.charPositionInLine ??
              (token as any).charPositionInLine ??
              0;
            location = {
              symbolRange: {
                startLine: tokenLine,
                startColumn: tokenStartCol,
                endLine: tokenLine,
                endColumn: tokenStartCol + tokenText.length,
              },
              identifierRange: {
                startLine: tokenLine,
                startColumn: tokenStartCol,
                endLine: tokenLine,
                endColumn: tokenStartCol + tokenText.length,
              },
            };
          }
        } else {
          // Fallback to token-based location if typeNameCtx not available
          const tokenSymbol = (token as any).symbol || token;
          const tokenText = tokenSymbol?.text || token?.text || collectionType;
          const tokenLine = tokenSymbol?.line ?? (token as any).line ?? 1;
          const tokenStartCol =
            tokenSymbol?.charPositionInLine ??
            (token as any).charPositionInLine ??
            0;
          location = {
            symbolRange: {
              startLine: tokenLine,
              startColumn: tokenStartCol,
              endLine: tokenLine,
              endColumn: tokenStartCol + tokenText.length,
            },
            identifierRange: {
              startLine: tokenLine,
              startColumn: tokenStartCol,
              endLine: tokenLine,
              endColumn: tokenStartCol + tokenText.length,
            },
          };
        }

        const parentContext = this.getCurrentMethodName();

        // Emit constructor call for the collection type
        const ctorRef = SymbolReferenceFactory.createConstructorCallReference(
          collectionType,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(ctorRef);

        // Also create a TYPE_DECLARATION reference for the type name itself
        // This allows hover resolution to work on the type name in constructor calls
        // (e.g., hovering on "List" in "new List<Integer>()" should resolve to the List class)
        const typeRef = SymbolReferenceFactory.createTypeDeclarationReference(
          collectionType,
          location,
          parentContext,
        );
        this.symbolTable.addTypeReference(typeRef);

        // Check if this constructor call has arguments (classCreatorRest)
        // If so, push onto methodCallStack for parameter tracking
        const classCreatorRest = (creator as any).classCreatorRest?.();
        if (classCreatorRest) {
          // This constructor call has arguments, track it on the stack
          this.methodCallStack.push({
            callRef: ctorRef,
            parameterRefs: [],
          });
        }

        // typeList handling is now done by enterTypeList, skip here
        return;
      }

      // Get the base type name from the createdName (for non-collection types)
      const idCreatedNamePairs = createdName.idCreatedNamePair();
      if (!idCreatedNamePairs || idCreatedNamePairs.length === 0) return;

      // Get the first idCreatedNamePair (the base type)
      const firstPair = idCreatedNamePairs[0];

      // Check if this is a collection type via typeName in the pair
      // Note: pairTypeName was already declared above for collection types
      const nonCollectionPairTypeName = (firstPair as any).typeName?.();
      if (nonCollectionPairTypeName) {
        const listToken = nonCollectionPairTypeName.LIST?.();
        const setToken = nonCollectionPairTypeName.SET?.();
        const mapToken = nonCollectionPairTypeName.MAP?.();

        if (listToken || setToken || mapToken) {
          const collectionType = listToken ? 'List' : setToken ? 'Set' : 'Map';
          const token = listToken || setToken || mapToken;

          // Extract location directly from token (TerminalNode)
          // Tokens have symbol property which is a Token with line/charPositionInLine
          const tokenSymbol = (token as any).symbol || token;
          const tokenText = tokenSymbol?.text || token?.text || collectionType;
          const tokenLine = tokenSymbol?.line ?? (token as any).line ?? 1;
          const tokenStartCol =
            tokenSymbol?.charPositionInLine ??
            (token as any).charPositionInLine ??
            0;

          const location: SymbolLocation = {
            symbolRange: {
              startLine: tokenLine,
              startColumn: tokenStartCol,
              endLine: tokenLine,
              endColumn: tokenStartCol + tokenText.length,
            },
            identifierRange: {
              startLine: tokenLine,
              startColumn: tokenStartCol,
              endLine: tokenLine,
              endColumn: tokenStartCol + tokenText.length,
            },
          };

          const parentContext = this.getCurrentMethodName();

          // Emit constructor call for the collection type
          const ctorRef = SymbolReferenceFactory.createConstructorCallReference(
            collectionType,
            location,
            parentContext,
          );
          this.symbolTable.addTypeReference(ctorRef);

          // Check if this constructor call has arguments (classCreatorRest)
          // If so, push onto methodCallStack for parameter tracking
          const classCreatorRest = (creator as any).classCreatorRest?.();
          if (classCreatorRest) {
            // This constructor call has arguments, track it on the stack
            this.methodCallStack.push({
              callRef: ctorRef,
              parameterRefs: [],
            });
          }

          // typeList handling is now done by enterTypeList, skip here
          return;
        }
      }

      const anyId = firstPair.anyId();
      if (!anyId) return;

      const typeName = anyId.text;
      const location = this.getLocationForReference(anyId);
      const parentContext = this.getCurrentMethodName();

      // Emit constructor call for the base type
      const ctorRef = SymbolReferenceFactory.createConstructorCallReference(
        typeName,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(ctorRef);

      // Check if this constructor call has arguments (classCreatorRest)
      // If so, push onto methodCallStack for parameter tracking
      const classCreatorRest = (creator as any).classCreatorRest?.();
      if (classCreatorRest) {
        // This constructor call has arguments, track it on the stack
        this.methodCallStack.push({
          callRef: ctorRef,
          parameterRefs: [],
        });
      }

      // typeList handling is now done by enterTypeList, skip here

      // Handle dotted names (e.g., Namespace.Type)
      if (idCreatedNamePairs.length > 1) {
        for (let i = 1; i < idCreatedNamePairs.length; i++) {
          const pair = idCreatedNamePairs[i];
          const anyId = pair.anyId();
          if (anyId) {
            const dottedTypeName = anyId.text;
            const dottedLocation = this.getLocationForReference(
              anyId as unknown as ParserRuleContext,
            );

            const dottedParamRef =
              SymbolReferenceFactory.createParameterTypeReference(
                dottedTypeName,
                dottedLocation,
                parentContext,
              );
            this.symbolTable.addTypeReference(dottedParamRef);
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        () => `Error capturing constructor call reference: ${error}`,
      );
    }
  }

  /**
   * Get the name of the current method being processed
   * Traverses the scope hierarchy to find the parent method symbol
   */
  private getCurrentMethodName(): string | undefined {
    // First, try to get the current method symbol directly
    const currentMethod = this.getCurrentMethod();
    if (currentMethod) {
      return currentMethod.name;
    }

    // Fallback: traverse the scope hierarchy to find a method symbol
    let currentScope: ScopeSymbol | null = this.getCurrentScopeSymbol();

    while (currentScope) {
      // Check if this scope's parentId points to a method symbol
      if (currentScope.parentId) {
        const parent = this.symbolTable
          .getAllSymbols()
          .find((s) => s.id === currentScope!.parentId);
        if (
          parent &&
          (parent.kind === SymbolKind.Method ||
            parent.kind === SymbolKind.Constructor)
        ) {
          return parent.name;
        }
        // If parent is a block, continue traversing
        if (parent && parent.kind === SymbolKind.Block) {
          currentScope = parent as ScopeSymbol;
        } else {
          currentScope = null;
        }
      } else {
        currentScope = null;
      }
    }

    return undefined;
  }

  /**
   * Get location information for references
   * @param ctx The parser context
   * @returns ANTLR-compliant location with 1-based line numbers
   */
  private getLocationForReference(ctx: ParserRuleContext): SymbolLocation {
    // For references, we want to focus on the identifier location
    // but still provide the full context range
    const identifierRange = this.getIdentifierRange(ctx);

    if (identifierRange) {
      return {
        symbolRange: this.getLocation(ctx).symbolRange, // Full context
        identifierRange: identifierRange, // Just the identifier
      };
    }

    // Fallback to standard location
    return this.getLocation(ctx);
  }

  /**
   * Extract precise locations for each part of a dotted type name
   * @param typeNames Array of TypeNameContext objects
   * @returns Array of SymbolLocation objects, one for each part
   */
  private getPreciseLocationsForDottedType(typeNames: any[]): SymbolLocation[] {
    return typeNames.map((tn) => {
      const id = tn.id();
      if (id) {
        return this.getLocationForReference(id);
      } else {
        // Handle collection types
        return this.getLocationForReference(tn);
      }
    });
  }

  /**
   * Determine if a type reference is in a type declaration context (variable/field declaration)
   * @param ctx The TypeRefContext
   * @returns true if this is a type declaration, false otherwise
   */
  private isTypeDeclarationContext(ctx: TypeRefContext): boolean {
    // Traverse up the parse tree to find the appropriate context
    let current: any = ctx.parent;

    while (current) {
      // Check for variable/field declaration contexts
      if (isVariableOrFieldDeclarationContext(current)) {
        return true;
      }

      // Check for parameter contexts
      if (isContextType(current, FormalParameterContext)) {
        return false;
      }

      // Move up to parent
      current = current.parent;
    }

    // Default to type declaration if we can't determine
    return true;
  }

  /**
   * Check if a type reference already exists for the given type name and context
   * This helps prevent duplicate type references
   * @param typeName The type name to check
   * @param context The context to check in
   * @returns true if a reference already exists, false otherwise
   */
  private hasExistingTypeReference(
    typeName: string,
    context: string | undefined,
  ): boolean {
    if (!context) return false;

    // Get all references from the symbol table and check for duplicates
    const allReferences = this.symbolTable.getAllReferences();

    // Only consider it a duplicate if an identical name+context already exists twice or more.
    // This keeps one occurrence for cases like List<String> and Map<String, T> that legitimately
    // need multiple distinct String references at different locations.
    let count = 0;
    for (const ref of allReferences as SymbolReference[]) {
      if (
        ref.name === typeName &&
        (ref.context === 5 || ref.context === 6) &&
        ref.parentContext === context
      ) {
        count += 1;
        if (count >= 2) return true;
      }
    }
    return false;
  }

  /**
   * Check if a type reference already exists at the same location
   * This helps prevent duplicate type references at the exact same position
   * @param typeName The type name to check
   * @param location The location to check
   * @param context The context to check in
   * @returns true if a reference already exists at the same location, false otherwise
   */
  private hasExistingTypeReferenceAtLocation(
    typeName: string,
    location: SymbolLocation,
    context: string | undefined,
    expectedContextType?: ReferenceContext,
  ): boolean {
    if (!context) return false;

    // Get all references from the symbol table and check for exact location matches
    const allReferences = this.symbolTable.getAllReferences();

    return allReferences.some(
      (ref) =>
        ref.name === typeName &&
        (expectedContextType === undefined ||
          ref.context === expectedContextType) &&
        ref.parentContext === context &&
        ref.location.identifierRange.startLine ===
          location.identifierRange.startLine &&
        ref.location.identifierRange.startColumn ===
          location.identifierRange.startColumn &&
        ref.location.identifierRange.endLine ===
          location.identifierRange.endLine &&
        ref.location.identifierRange.endColumn ===
          location.identifierRange.endColumn,
    );
  }

  /**
   * Determine the appropriate context for a type reference based on the parser tree
   * @param ctx The TypeRefContext
   * @returns The context string or undefined if not in a recognizable context
   */
  private determineTypeReferenceContext(
    ctx: TypeRefContext,
  ): string | undefined {
    // Traverse up the parse tree to find the appropriate context
    let current = ctx.parent;

    while (current) {
      // Check for method-related contexts
      if (isMethodRelatedContext(current)) {
        return this.getCurrentMethodName();
      }

      // Check for field/property contexts
      if (isFieldOrPropertyContext(current)) {
        return this.getCurrentType()?.name;
      }

      // Move up to parent
      current = current.parent;
    }

    // Fallback to current method or type context
    return this.getCurrentMethodName() || this.getCurrentType()?.name;
  }

  /**
   * Determine if this TypeRef is in a method return type context
   * @param ctx The TypeRefContext to check
   * @returns true if this is a method return type, false otherwise
   */
  private isMethodReturnTypeContext(ctx: TypeRefContext): boolean {
    // Traverse up the parse tree to find the appropriate context
    let current: any = ctx.parent;

    while (current) {
      // Check for method declaration contexts
      if (isMethodDeclarationContext(current)) {
        // We're in a method declaration, but we need to check if this TypeRef
        // is specifically the return type (not a parameter type or local variable type)

        // In method declarations, the return type comes before the method name
        // Parameters come after the method name in parentheses
        // We can distinguish by checking if we're in the return type part

        // For MethodDeclarationContext, the structure is:
        // modifiers? typeRef methodName ( formalParameters? ) block
        // For InterfaceMethodDeclarationContext, the structure is:
        // modifiers? typeRef methodName ( formalParameters? ) ;

        // If we're in a method declaration and this TypeRef is not inside
        // formalParameters, then it's the return type
        if (isContextType(current, MethodDeclarationContext)) {
          const methodCtx = current as MethodDeclarationContext;
          // Check if this TypeRef is the return type (not in formalParameters)
          return !this.isInFormalParameters(ctx, methodCtx);
        } else if (isContextType(current, InterfaceMethodDeclarationContext)) {
          const methodCtx = current as InterfaceMethodDeclarationContext;
          // Check if this TypeRef is the return type (not in formalParameters)
          return !this.isInFormalParameters(ctx, methodCtx);
        }
      }

      // Check if this TypeRef is in a local variable declaration context
      // If it is, it's not a method return type
      if (isVariableOrFieldDeclarationContext(current)) {
        return false;
      }

      // Move up to parent
      current = current.parent;
    }

    return false;
  }

  /**
   * Check if a TypeRef is inside formal parameters of a method
   * @param typeRefCtx The TypeRefContext to check
   * @param methodCtx The method declaration context
   * @returns true if the TypeRef is inside formal parameters, false otherwise
   */
  private isInFormalParameters(
    typeRefCtx: TypeRefContext,
    methodCtx: MethodDeclarationContext | InterfaceMethodDeclarationContext,
  ): boolean {
    // Check if the TypeRef is a descendant of formalParameters
    const formalParams = methodCtx.formalParameters();
    if (!formalParams) {
      return false;
    }

    // Traverse up from the TypeRef to see if we hit formalParameters
    let current: any = typeRefCtx.parent;
    while (current) {
      if (current === formalParams) {
        return true;
      }
      if (current === methodCtx) {
        // We've reached the method context without hitting formalParameters
        return false;
      }
      current = current.parent;
    }

    return false;
  }

  /**
   * Determine if capturing should be suppressed for the given ctx because
   * it lies within the current assignment LHS range.
   */
  private shouldSuppress(ctx: ParserRuleContext): boolean {
    if (!this.suppressAssignmentLHS || !this.suppressedLHSRange) return false;
    const loc = this.getLocation(ctx);
    const r = this.suppressedLHSRange;
    const withinLines =
      loc.identifierRange.startLine >= r.identifierRange.startLine &&
      loc.identifierRange.endLine <= r.identifierRange.endLine;
    const withinCols =
      (loc.identifierRange.startLine > r.identifierRange.startLine ||
        loc.identifierRange.startColumn >= r.identifierRange.startColumn) &&
      (loc.identifierRange.endLine < r.identifierRange.endLine ||
        loc.identifierRange.endColumn <= r.identifierRange.endColumn);
    return withinLines && withinCols;
  }

  /**
   * Check if a variable name exists in the current scope
   */
  private isVariableInScope(variableName: string): boolean {
    // Check if the variable exists in the current symbol table scope
    const currentScope = this.scopeStack.peek() ?? null;
    if (!currentScope) {
      return false;
    }
    return this.symbolTable
      .getSymbolsInScope(currentScope.id)
      .some((symbol: ApexSymbol) => symbol.name === variableName);
  }

  /**
   * Check if an identifier is a method call parameter
   * This helps distinguish between identifiers that should be captured
   * even when they appear inside dot expressions
   */
  private isMethodCallParameter(ctx: IdPrimaryContext): boolean {
    let current: any = ctx.parent;

    while (current) {
      // If we find an expression list, this is likely a method call parameter
      if (isMethodCallContext(current)) {
        return true;
      }

      // Move up to parent
      current = current.parent;
    }

    return false;
  }

  /**
   * Check if an identifier is in an assignment LHS context
   * This helps prevent duplication between enterAssignExpression and enterAnyId
   */
  private isInAssignmentLHS(ctx: AnyIdContext): boolean {
    let current: any = ctx.parent;

    while (current) {
      // If we find an assignment expression, this is in an assignment LHS
      if (isContextType(current, AssignExpressionContext)) {
        return true;
      }

      // Move up to parent
      current = current.parent;
    }

    return false;
  }
  private createTypeSymbol(
    ctx: ParserRuleContext,
    name: string,
    kind:
      | SymbolKind.Class
      | SymbolKind.Interface
      | SymbolKind.Trigger
      | SymbolKind.Enum,
    modifiers: SymbolModifiers,
  ): TypeSymbol | EnumSymbol {
    const location = this.getLocation(ctx);
    const parent = this.getCurrentType();

    // Determine namespace based on context
    const namespace = this.determineNamespaceForType(name, kind);

    // Convert @isTest annotation to isTestMethod modifier for classes
    const annotations = this.getCurrentAnnotations();
    if (annotations.some((ann) => ann.name.toLowerCase() === 'istest')) {
      modifiers = { ...modifiers, isTestMethod: true };
    }

    // Get current scope path for unique symbol ID
    // Include root symbol's prefix and name in scopePath to match class ID format
    // Class ID: fileUri:class:MyClass
    // Child symbols should include: class:MyClass in their scopePath
    const baseScopePath = this.symbolTable.getCurrentScopePath(
      this.getCurrentScopeSymbol(),
    );
    const rootSymbol = this.findRootSymbol(this.getCurrentScopeSymbol());
    let scopePath: string[] = baseScopePath;
    if (rootSymbol) {
      // Include the root symbol's prefix (kind) and name to match the class ID format
      // e.g., ['class', 'MyClass', 'block1'] instead of ['MyClass', 'block1']
      const rootPrefix = rootSymbol.kind; // e.g., 'class', 'interface', 'enum', 'trigger'
      scopePath = [rootPrefix, rootSymbol.name, ...baseScopePath];
    }
    const typeSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      kind,
      location,
      this.currentFilePath,
      modifiers,
      parent?.id || null,
      undefined, // No typeData needed - interfaces are set directly on TypeSymbol
      namespace, // Pass the determined namespace (can be null)
      this.getCurrentAnnotations(),
      scopePath, // Pass scope path for unique ID generation
    ) as TypeSymbol;

    // Parent key removed - use parentId for parent resolution

    // For enums, we need to add the values array
    // TODO: change to a more generic approach
    if (isEnumSymbol(typeSymbol)) {
      typeSymbol.values = [];
      return typeSymbol;
    }

    return typeSymbol;
  }

  /**
   * Determine namespace for a type based on context
   */
  private determineNamespaceForType(
    name: string,
    kind: SymbolKind,
  ): Namespace | null {
    // For standard Apex classes, extract namespace from file path
    if (this.currentFilePath && this.currentFilePath.startsWith('apexlib://')) {
      // Extract namespace from path like 'apexlib://resources/StandardApexLibrary/System/Assert.cls'
      // The namespace is the directory after StandardApexLibrary (e.g., "System")
      const match = this.currentFilePath.match(
        /apexlib:\/\/resources\/StandardApexLibrary\/([^\/]+)\//,
      );
      if (match) {
        const namespaceName = match[1];
        return Namespaces.create(namespaceName);
      }
    }

    // Top-level types get project namespace
    const currentType = this.getCurrentType();
    if (!currentType) {
      return this.currentNamespace;
    }

    // Inner types inherit from outer type
    const parentNamespace = currentType.namespace;
    if (parentNamespace instanceof Namespace) {
      return parentNamespace;
    }
    return null;
  }

  private createMethodSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
    returnType: TypeInfo,
  ): MethodSymbol {
    const location = this.getLocation(ctx);
    const parent = this.getCurrentType();

    // Inherit namespace from containing type
    const parentNamespace = parent?.namespace;
    const namespace =
      parentNamespace instanceof Namespace ? parentNamespace : null;

    // Get current scope path for unique symbol ID
    // Include root symbol's prefix and name in scopePath to match class ID format
    // Class ID: fileUri:class:MyClass
    // Method ID should be: fileUri:class:MyClass:block1:method:myMethod
    const baseScopePath = this.symbolTable.getCurrentScopePath(
      this.getCurrentScopeSymbol(),
    );
    const rootSymbol = this.findRootSymbol(this.getCurrentScopeSymbol());
    let scopePath: string[] = baseScopePath;
    if (rootSymbol) {
      // Include the root symbol's prefix (kind) and name to match the class ID format
      // e.g., ['class', 'MyClass', 'block1'] instead of ['MyClass', 'block1']
      const rootPrefix = rootSymbol.kind; // e.g., 'class', 'interface', 'enum', 'trigger'
      scopePath = [rootPrefix, rootSymbol.name, ...baseScopePath];
    }

    // Convert @isTest annotation to isTestMethod modifier
    const annotations = this.getCurrentAnnotations();
    if (annotations.some((ann) => ann.name.toLowerCase() === 'istest')) {
      modifiers = { ...modifiers, isTestMethod: true };
    }

    // CRITICAL: Method's parentId should point to the class block (for uniform FQN hierarchy)
    // This ensures FQN follows: class -> class block -> method block -> ...
    // Find the class block from the stack
    let methodParentId: string | null = null;
    const classBlock = this.getCurrentScopeSymbol();
    if (classBlock && classBlock.scopeType === 'class') {
      methodParentId = classBlock.id;
    } else if (parent) {
      // Fallback: if we can't find the class block, use the class symbol
      methodParentId = parent.id;
    }

    const methodSymbol = SymbolFactory.createFullSymbolWithNamespace(
      name,
      SymbolKind.Method,
      location,
      this.currentFilePath,
      modifiers,
      methodParentId,
      undefined, // No typeData needed - returnType and parameters are set directly on MethodSymbol
      namespace, // Inherit namespace from parent (can be null)
      this.getCurrentAnnotations(),
      scopePath, // Pass scope path for unique ID generation
    ) as MethodSymbol;

    // Initialize the parameters array for MethodSymbol interface
    methodSymbol.parameters = [];
    methodSymbol.returnType = returnType;
    methodSymbol.isConstructor = false;

    return methodSymbol;
  }

  private createVariableSymbol(
    ctx: ParserRuleContext,
    modifiers: SymbolModifiers,
    name: string,
    kind:
      | SymbolKind.Property
      | SymbolKind.Variable
      | SymbolKind.Parameter
      | SymbolKind.Field
      | SymbolKind.EnumValue,
    type: TypeInfo,
  ): VariableSymbol {
    const location = this.getLocation(ctx);
    // Peek the stack to get current owner (ScopeSymbol)
    const parent = this.scopeStack.peek() || null;

    // Inherit namespace from containing type or method (blocks don't have namespaces)
    let namespace: Namespace | null = null;
    if (parent) {
      if (parent.kind === SymbolKind.Block) {
        // Block doesn't have namespace, search down stack for type or method
        const typeOrMethod = this.getCurrentType() || this.getCurrentMethod();
        const parentNamespace = typeOrMethod?.namespace;
        namespace =
          parentNamespace instanceof Namespace ? parentNamespace : null;
      } else {
        // Type or method has namespace directly (future expansion)
        const parentNamespace = (parent as TypeSymbol | MethodSymbol).namespace;
        namespace =
          parentNamespace instanceof Namespace ? parentNamespace : null;
      }
    }

    // Get current scope path for unique symbol ID
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
      undefined, // No typeData needed - type is set directly on VariableSymbol
      namespace, // Inherit namespace from parent (can be null)
      this.getCurrentAnnotations(),
      scopePath, // Pass scope path for unique ID generation
    ) as VariableSymbol;

    // Set the type property for VariableSymbol interface compatibility
    variableSymbol.type = type;

    return variableSymbol;
  }

  private getCurrentPath(): string[] {
    const path: string[] = [];
    let current = this.getCurrentType();
    while (current) {
      path.unshift(current.name);
      current = current ? (this.getParent(current) as TypeSymbol | null) : null;
    }
    return path;
  }

  /**
   * Create a validation scope for identifier validation
   */
  private createValidationScope() {
    return {
      // Assume long identifiers supported if namespace is set
      supportsLongIdentifiers: this.projectNamespace !== undefined,
      version: DEFAULT_SALESFORCE_API_VERSION,
      isFileBased: true,
    };
  }

  /**
   * Extract identifier range for class declaration contexts
   * Handles cases where the class name might be in different locations
   */
  private extractClassIdentifierRange(
    ctx: ClassDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Extract identifier range for constructor declaration contexts
   * Handles qualified name cases and extracts the actual constructor name
   */
  private extractConstructorIdentifierRange(
    ctx: ConstructorDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Extract identifier range for field declaration contexts
   * Handles variable declarators within field declarations
   */
  private extractFieldIdentifierRange(
    ctx: FieldDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Extract identifier range for property declaration contexts
   */
  private extractPropertyIdentifierRange(
    ctx: PropertyDeclarationContext,
  ): Range | null {
    // Use the main identifier extraction method
    return this.getIdentifierRange(ctx);
  }

  /**
   * Create a precise location for just the base expression part
   */
  private createPreciseBaseLocation(
    baseExpression: string,
    fullLocation: SymbolLocation,
  ): SymbolLocation {
    // Calculate the precise location for just the base expression
    // The base expression starts at the same position as the full location
    // but ends after the base expression length
    const baseLength = baseExpression.length;

    return {
      symbolRange: {
        startLine: fullLocation.symbolRange.startLine,
        startColumn: fullLocation.symbolRange.startColumn,
        endLine: fullLocation.symbolRange.startLine,
        endColumn: fullLocation.symbolRange.startColumn + baseLength,
      },
      identifierRange: {
        startLine: fullLocation.identifierRange.startLine,
        startColumn: fullLocation.identifierRange.startColumn,
        endLine: fullLocation.identifierRange.startLine,
        endColumn: fullLocation.identifierRange.startColumn + baseLength,
      },
    };
  }

  /**
   * Create a constructor symbol
   */
  private createConstructorSymbol(
    ctx: ParserRuleContext,
    name: string,
    modifiers: SymbolModifiers,
  ): MethodSymbol {
    const location = this.getLocation(ctx);
    const parent = this.getCurrentType();

    // Inherit namespace from containing type
    const parentNamespace = parent?.namespace;
    const namespace =
      parentNamespace instanceof Namespace ? parentNamespace : null;

    // Get current scope path for unique symbol ID
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
      undefined, // No typeData needed - returnType and parameters are set directly on MethodSymbol
      namespace, // Inherit namespace from parent (can be null)
      this.getCurrentAnnotations(),
      scopePath, // Pass scope path for unique ID generation
    ) as MethodSymbol;

    // Initialize the parameters array for MethodSymbol interface
    constructorSymbol.parameters = [];
    constructorSymbol.returnType = createPrimitiveType('void');
    constructorSymbol.isConstructor = true;

    return constructorSymbol;
  }

  /**
   * Create a TypeReference for expression nodes
   */
  private createExpressionNode(
    value: string,
    location: SymbolLocation,
    context: ReferenceContext,
  ): SymbolReference {
    // For individual identifiers in a chain, ensure identifierRange matches symbolRange
    const correctedLocation: SymbolLocation = {
      symbolRange: location.symbolRange,
      identifierRange: location.symbolRange, // For individual identifiers, both ranges should be the same
    };

    return {
      name: value, // SymbolReference.name
      location: correctedLocation,
      context,
      resolvedSymbolId: undefined,
      parentContext: this.getCurrentMethod()?.name,
      isStatic: false,
    };
  }

  /**
   * Create a SymbolReference that represents a chained expression
   */
  private createChainedExpression(
    fullExpression: string,
    baseLocation: SymbolLocation,
    finalLocation: SymbolLocation,
  ): SymbolReference {
    return {
      name: fullExpression, // SymbolReference.name contains the full expression
      location: baseLocation, // Use base location as the main location
      context: ReferenceContext.CHAINED_TYPE,
      resolvedSymbolId: undefined,
      parentContext: this.getCurrentMethod()?.name,
      isStatic: false,
    };
  }

  /**
   * Process a standalone method call (not part of a chain)
   */
  private processStandaloneMethodCall(
    ctx: DotMethodCallContext,
    methodName: string,
    methodLocation: SymbolLocation,
  ): void {
    try {
      // Extract qualifier from the parent DotExpression
      let qualifier: string | undefined = undefined;
      let qualifierLocation: SymbolLocation | undefined = undefined;
      const parent = ctx.parent as ParserRuleContext | undefined;

      if (
        parent &&
        parent.constructor &&
        parent.constructor.name === 'DotExpressionContext'
      ) {
        const dotParent = parent as unknown as DotExpressionContext;
        const lhs =
          (dotParent as any).expression?.(0) ||
          (dotParent as any).expression?.();
        if (lhs) {
          qualifier = this.getTextFromContext(
            lhs as unknown as ParserRuleContext,
          );
          // Use getLocationForReference to get precise identifier location
          qualifierLocation = this.getLocationForReference(
            lhs as unknown as ParserRuleContext,
          );
        }
      }

      const parentContext = this.getCurrentMethodName();

      // Create method call reference
      if (qualifier) {
        const methodRef = SymbolReferenceFactory.createMethodCallReference(
          methodName,
          methodLocation,
          parentContext,
        );

        this.symbolTable.addTypeReference(methodRef);

        // Also create a reference for the qualifier
        // When correction is enabled, create CLASS_REFERENCE directly
        // When correction is disabled, create VARIABLE_USAGE so it can be verified it stays as VARIABLE_USAGE
        if (qualifier && qualifierLocation) {
          // For qualified static calls, always create a reference for the qualifier
          // When correction is disabled, create VARIABLE_USAGE (won't be upgraded by second pass)
          // When correction is enabled, create CLASS_REFERENCE directly
          // Note: In qualified calls, the qualifier represents a class/namespace, not a variable usage
          if (this.enableReferenceCorrection) {
            // Correction enabled: create CLASS_REFERENCE directly
            const classRef = SymbolReferenceFactory.createClassReference(
              qualifier,
              qualifierLocation,
              parentContext,
            );
            this.symbolTable.addTypeReference(classRef);
          } else {
            // Correction disabled: create VARIABLE_USAGE (won't be upgraded by second pass)
            const varRef = SymbolReferenceFactory.createVariableUsageReference(
              qualifier,
              qualifierLocation,
              parentContext,
            );
            this.symbolTable.addTypeReference(varRef);
          }
        }
      } else {
        // For unqualified method calls
        const reference = SymbolReferenceFactory.createMethodCallReference(
          methodName,
          methodLocation,
          parentContext,
        );
        this.symbolTable.addTypeReference(reference);
      }
    } catch (error) {
      this.logger.warn(
        () => `Error processing standalone method call: ${error}`,
      );
    }
  }

  /**
   * Create a chain root TypeRef from the collected chain scope
   * The root reference spans the entire chain and contains all nodes
   * Uses right-to-left analysis to better categorize chain nodes
   */
  private createChainRootReference(
    chainScope: NonNullable<typeof this.chainExpressionScope>,
  ): void {
    try {
      const { baseExpression, chainNodes, startLocation } = chainScope;

      // Special handling for 'this' keyword - treat as instance member access
      if (baseExpression === 'this') {
        const parentContext = this.getCurrentMethodName();

        // For 'this' expressions, create individual references for each chain node
        // This provides better granularity for LSP features and semantic accuracy
        chainNodes.forEach((chainNode, index) => {
          const memberName = chainNode.name;
          const memberLocation = chainNode.location;

          // Use the original context from the chain node
          // If it was created with METHOD_CALL context, it's a method call
          // If it was created with FIELD_ACCESS context, it's a field access
          let context = chainNode.context;

          // If the context is still CHAIN_STEP, we need to determine the appropriate context
          if (context === ReferenceContext.CHAIN_STEP) {
            // For 'this.member' expressions, we can't easily determine if it's a method or field
            // without more context. We'll default to FIELD_ACCESS and let the resolution
            // system figure it out later.
            context = ReferenceContext.FIELD_ACCESS;
          }

          // Create a simple reference for the member access
          const memberRef = new EnhancedSymbolReference(
            memberName,
            memberLocation,
            context,
            undefined, // resolvedSymbolId - will be set during second-pass resolution
            parentContext,
          );

          this.symbolTable.addTypeReference(memberRef);
        });

        return;
      }

      // Create a precise location for the base expression (just the first part)
      const baseExpressionLocation = this.createPreciseBaseLocation(
        baseExpression,
        startLocation,
      );

      // Create initial chain nodes with conservative CHAIN_STEP contexts
      const initialChainNodes = [
        this.createExpressionNode(
          baseExpression,
          baseExpressionLocation,
          ReferenceContext.CHAIN_STEP, // Start with ambiguous context
        ),
        ...chainNodes.map((node) => ({
          ...node,
          // Preserve original context - don't override METHOD_CALL contexts
        })),
      ];

      // Apply right-to-left analysis to narrow contexts
      const analyzedChainNodes = this.analyzeChainWithRightToLeftNarrowing(
        initialChainNodes,
        baseExpression,
        startLocation,
      );

      // Create a simplified chained expression structure
      const fullExpression = `${baseExpression}.${chainNodes.map((s) => s.name).join('.')}`;
      const finalLocation =
        chainNodes.length > 0
          ? chainNodes[chainNodes.length - 1].location
          : startLocation;

      const chainedExpression = this.createChainedExpression(
        fullExpression,
        startLocation,
        finalLocation,
      );

      // Create root reference with analyzed nodes
      const rootRef = SymbolReferenceFactory.createChainedExpressionReference(
        analyzedChainNodes,
        chainedExpression,
        this.getCurrentMethodName(),
      );

      this.symbolTable.addTypeReference(rootRef);
    } catch (error) {
      this.logger.warn(() => `Error creating chain root reference: ${error}`);
    }
  }

  /**
   * Chain expression scope for capturing complete chains as single units
   */
  private chainExpressionScope: {
    isActive: boolean;
    baseExpression: string;
    chainNodes: SymbolReference[];
    startLocation: SymbolLocation;
    depth: number;
  } | null = null;

  /**
   * Get the location of the base expression in a chained expression
   * e.g., for "System.Url.getOrgDomainUrl()", return the location of "System"
   */
  private getBaseExpressionLocation(
    ctx: DotMethodCallContext,
    baseQualifier: string,
  ): SymbolLocation {
    try {
      // Get the parent DotExpression to find the base qualifier location
      const parent = ctx.parent as ParserRuleContext | undefined;
      if (
        parent &&
        parent.constructor &&
        parent.constructor.name === 'DotExpressionContext'
      ) {
        const dotParent = parent as unknown as DotExpressionContext;
        const lhs =
          (dotParent as any).expression?.(0) ||
          (dotParent as any).expression?.();
        if (lhs) {
          // Use the left-hand expression location for the base qualifier
          return this.getLocation(lhs as unknown as ParserRuleContext);
        }
      }

      // Fallback: use the context location but adjust for the base qualifier
      const contextLocation = this.getLocation(ctx);
      return {
        ...contextLocation,
        identifierRange: {
          startLine: contextLocation.identifierRange.startLine,
          startColumn: contextLocation.identifierRange.startColumn,
          endLine: contextLocation.identifierRange.startLine,
          endColumn:
            contextLocation.identifierRange.startColumn + baseQualifier.length,
        },
      };
    } catch (error) {
      this.logger.warn(
        () => `Error getting base expression location: ${error}`,
      );
      // Fallback to context location
      return this.getLocation(ctx);
    }
  }

  /**
   * Analyze a chained expression using right-to-left parsing knowledge
   * to progressively narrow the context of each node
   */
  private analyzeChainWithRightToLeftNarrowing(
    chainNodes: SymbolReference[],
    baseExpression: string,
    startLocation: SymbolLocation,
  ): SymbolReference[] {
    const analyzedNodes: SymbolReference[] = [];

    // Start from the rightmost node (method call) and work leftward
    for (let i = chainNodes.length - 1; i >= 0; i--) {
      const currentNode = chainNodes[i];
      const nextNode = i < chainNodes.length - 1 ? analyzedNodes[0] : null;

      // Apply narrowing rules based on the next node
      const narrowedContext = this.narrowContextBasedOnNextNode(
        currentNode,
        nextNode,
        i === 0, // isBaseNode
      );

      // Create new node with narrowed context
      const narrowedNode: SymbolReference = {
        ...currentNode,
        context: narrowedContext,
      };

      analyzedNodes.unshift(narrowedNode);
    }

    return analyzedNodes;
  }

  /**
   * Narrow the context of a node based on what follows it in the chain
   */
  private narrowContextBasedOnNextNode(
    currentNode: SymbolReference,
    nextNode: SymbolReference | null,
    isBaseNode: boolean,
  ): ReferenceContext {
    // If this is the rightmost node (method call), it's already well-defined
    if (nextNode === null) {
      return currentNode.context; // Keep existing context
    }

    // Special case: If current node is a standard library class name, treat it as CLASS_REFERENCE
    if (this.isStandardLibraryClassName(currentNode.name)) {
      return ReferenceContext.CLASS_REFERENCE;
    }

    // Special case: If current node is a variable in scope, treat it as CLASS_REFERENCE
    // This handles cases like "acc.Name" where "acc" is a variable
    if (this.isVariableInScope(currentNode.name)) {
      return ReferenceContext.CLASS_REFERENCE;
    }

    // If current node is already a METHOD_CALL, preserve it
    // This is needed because the right-to-left analysis might try to narrow it
    if (currentNode.context === ReferenceContext.METHOD_CALL) {
      return ReferenceContext.METHOD_CALL;
    }

    // Apply narrowing rules based on the next node's context
    switch (nextNode.context) {
      case ReferenceContext.METHOD_CALL:
        // If next node is a method call, current node must be:
        // - Class (for static methods)
        // - Instance (for instance methods)
        // - Namespace (for namespace.method calls)
        if (isBaseNode) {
          // Base node could be class, namespace, or instance
          return ReferenceContext.CHAIN_STEP; // Mark as ambiguous
        } else {
          // Non-base nodes are more likely to be classes or namespaces
          return ReferenceContext.CHAIN_STEP;
        }

      case ReferenceContext.FIELD_ACCESS:
        // If next node is field access, current node must be:
        // - Class (for static fields)
        // - Instance (for instance fields)
        if (isBaseNode) {
          return ReferenceContext.CHAIN_STEP;
        } else {
          return ReferenceContext.CHAIN_STEP;
        }

      case ReferenceContext.CHAIN_STEP:
        // If next node is also ambiguous, current node remains ambiguous
        return ReferenceContext.CHAIN_STEP;

      default:
        // For other contexts, use chain step as default
        return ReferenceContext.CHAIN_STEP;
    }
  }

  /**
   * Create a new chain scope from a dot expression context
   */
  private createNewChainScope(ctx: DotExpressionContext): ChainScope {
    return {
      isActive: true,
      baseExpression: this.extractBaseExpressionFromParser(ctx),
      chainNodes: [],
      startLocation: this.getLocation(ctx),
      depth: 0,
    };
  }

  /**
   * Finalize a chain scope by creating the appropriate references
   */
  private finalizeChainScope(chainScope: ChainScope): void {
    if (!chainScope.isActive) return;

    try {
      const { baseExpression, chainNodes, startLocation } = chainScope;

      // Special handling for 'this' keyword
      if (baseExpression === 'this') {
        this.handleThisChain(chainNodes);
        return;
      }

      // Create precise location for the base expression
      const baseExpressionLocation = this.createPreciseBaseLocation(
        baseExpression,
        startLocation,
      );

      // Apply right-to-left analysis
      const analyzedChainNodes = this.analyzeChainWithRightToLeftNarrowing(
        [
          this.createExpressionNode(
            baseExpression,
            baseExpressionLocation,
            ReferenceContext.CHAIN_STEP,
          ),
          ...chainNodes,
        ],
        baseExpression,
        startLocation,
      );

      // Create chained expression
      const fullExpression = `${baseExpression}.${chainNodes.map((s) => s.name).join('.')}`;
      const finalLocation =
        chainNodes.length > 0
          ? chainNodes[chainNodes.length - 1].location
          : startLocation;

      const chainedExpression = this.createChainedExpression(
        fullExpression,
        startLocation,
        finalLocation,
      );

      // Create root reference
      const rootRef = SymbolReferenceFactory.createChainedExpressionReference(
        analyzedChainNodes,
        chainedExpression,
        this.getCurrentMethodName(),
      );

      this.symbolTable.addTypeReference(rootRef);

      // If this chained expression is used as a method parameter, add it to the parameter list
      // This ensures chained expressions in method parameters are properly tracked
      if (this.methodCallStack.size > 0) {
        this.addToCurrentMethodParameters(rootRef);
      }

      // Also capture the base expression as a TypeReference for hover resolution
      // This is needed for qualified references like System.debug where the base (System) needs to be resolvable
      const baseRef = SymbolReferenceFactory.createVariableUsageReference(
        baseExpression,
        baseExpressionLocation,
        this.getCurrentMethodName(),
      );
      this.symbolTable.addTypeReference(baseRef);
    } catch (error) {
      this.logger.warn(() => `Error finalizing chain scope: ${error}`);
    }
  }

  /**
   * Extract base expression from parser structure using identifier extraction
   * This ensures we only get identifiers, not method calls or full expressions
   */
  private extractBaseExpressionFromParser(ctx: DotExpressionContext): string {
    try {
      // Get the left-hand expression to find the base qualifier
      const lhs = (ctx as any).expression?.(0) || (ctx as any).expression?.();
      if (lhs) {
        // Check for THIS keyword explicitly first
        // THIS keyword can appear in PrimaryExpressionContext
        if (isContextType(lhs, PrimaryExpressionContext)) {
          const primaryExpr = lhs as PrimaryExpressionContext;
          const primary = primaryExpr.primary?.();
          if (primary) {
            // Check if primary contains THIS token
            const thisToken = (primary as any).THIS?.();
            if (thisToken) {
              return 'this';
            }
          }
        }

        // Also check directly on the expression context for THIS token
        const thisTokenDirect = (lhs as any).THIS?.();
        if (thisTokenDirect) {
          return 'this';
        }

        // Use extractIdentifiersFromExpression to get only identifiers, not method calls
        const identifiers = this.extractIdentifiersFromExpression(
          lhs as unknown as ParserRuleContext,
        );
        // Return the first identifier (base expression)
        return identifiers.length > 0 ? identifiers[0] : 'unknown';
      }
      return 'unknown';
    } catch (error) {
      this.logger.warn(
        () => `Error extracting base expression from parser: ${error}`,
      );
      return 'unknown';
    }
  }

  /**
   * Handle 'this' chain expressions by creating individual references
   */
  private handleThisChain(chainNodes: SymbolReference[]): void {
    const parentContext = this.getCurrentMethodName();

    chainNodes.forEach((chainNode, index) => {
      const memberName = chainNode.name;
      const memberLocation = chainNode.location;

      // Determine appropriate context
      let context = chainNode.context;
      if (context === ReferenceContext.CHAIN_STEP) {
        context = ReferenceContext.FIELD_ACCESS;
      }

      // Create member access reference
      const memberRef = new EnhancedSymbolReference(
        memberName,
        memberLocation,
        context,
        undefined, // resolvedSymbolId - will be set during second-pass resolution
        parentContext,
      );

      this.symbolTable.addTypeReference(memberRef);
    });
  }

  /**
   * Check if a name is a standard library class name
   * This helps identify standard library classes that should be treated as CLASS_REFERENCE
   */
  private isStandardLibraryClassName(name: string): boolean {
    const resourceLoader = ResourceLoader.getInstance({
      preloadStdClasses: true,
    });

    // Check if the name could be resolved from the standard library
    return resourceLoader.couldResolveSymbol(name);
  }

  /**
   * Second pass: Correct reference contexts and resolve same-file symbol references
   * This performs two operations:
   * 1. Fixes VARIABLE_USAGE references that should be CLASS_REFERENCE
   * 2. Resolves all same-file references to their symbol definitions
   * Called from exitCompilationUnit, exitTriggerUnit, and exitAnonymousUnit
   * 
   * Now delegates to ApexReferenceResolver for consistent resolution logic across all listeners
   */
  private correctReferenceContexts(): void {
    // Early return if correction is disabled
    if (!this.enableReferenceCorrection) {
      return;
    }

    // Delegate to ApexReferenceResolver for consistent resolution logic
    // This ensures all listeners (full and layered) use the same resolution process
    const result = this.referenceResolver.resolveSameFileReferences(
      this.symbolTable,
      this.currentFilePath,
    );

    if (result.correctedCount > 0) {
      this.logger.debug(
        () =>
          `[correctReferenceContexts] Corrected ${result.correctedCount} reference ` +
          'context(s)',
      );
    }

    if (result.resolvedCount > 0) {
      this.logger.debug(
        () =>
          `[correctReferenceContexts] Resolved ${result.resolvedCount} same-file ` +
          'reference(s) to their symbol definitions',
      );
    }
  }

  /**
   * Determine if a VARIABLE_USAGE reference should be CLASS_REFERENCE
   * Uses the symbol table's own symbols to check if the name is a class
   */
  private shouldBeClassReference(ref: SymbolReference): boolean {
    // First check if this is a qualifier in a qualified call or base expression in a chain
    // If it is, it should be CLASS_REFERENCE regardless of whether the class is in this file
    // This handles cross-file class references like FileUtilities.createFile()
    const isQualifierOrBase =
      this.isQualifierInQualifiedCall(ref) || this.isBaseExpressionInChain(ref);

    if (isQualifierOrBase) {
      // This is a qualifier or base expression - should be CLASS_REFERENCE
      // Even if the class isn't in this file, it's still a class reference
      return true;
    }

    // If not a qualifier/base, check if this name resolves to a class in the current symbol table
    const allSymbols = this.symbolTable.getAllSymbols();
    const classCandidates = allSymbols.filter(
      (s) =>
        (s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface) &&
        s.name === ref.name,
    );

    if (classCandidates.length === 0) {
      // Not a class in this file and not a qualifier/base - keep as VARIABLE_USAGE
      return false;
    }

    // Found a class in this file - should be CLASS_REFERENCE
    return true;
  }

  /**
   * Check if a reference is a qualifier in a qualified method call
   */
  private isQualifierInQualifiedCall(ref: SymbolReference): boolean {
    // Check if there's a METHOD_CALL reference on the same line that might use this as qualifier
    const allRefs = this.symbolTable.getAllReferences();
    const sameLineRefs = allRefs.filter(
      (r) =>
        r.location.identifierRange.startLine ===
        ref.location.identifierRange.startLine,
    );

    // Look for METHOD_CALL references that come after this reference on the same line
    for (const otherRef of sameLineRefs) {
      if (
        otherRef.context === ReferenceContext.METHOD_CALL &&
        otherRef.location.identifierRange.startColumn >
          ref.location.identifierRange.endColumn
      ) {
        // Check if this reference's name matches a qualifier in the method call
        // For chained references, check chainNodes
        if (isChainedSymbolReference(otherRef)) {
          const chainNodes = otherRef.chainNodes;
          if (
            chainNodes &&
            chainNodes.length >= 2 &&
            chainNodes[0].name === ref.name
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if a reference is the base expression in a chained expression
   */
  private isBaseExpressionInChain(ref: SymbolReference): boolean {
    // Check if there's a CHAINED_TYPE reference that includes this as the first node
    const allRefs = this.symbolTable.getAllReferences();
    const sameLineRefs = allRefs.filter(
      (r) =>
        r.location.identifierRange.startLine ===
        ref.location.identifierRange.startLine,
    );

    for (const otherRef of sameLineRefs) {
      if (isChainedSymbolReference(otherRef)) {
        const chainNodes = otherRef.chainNodes;
        if (chainNodes && chainNodes.length > 0) {
          const firstNode = chainNodes[0];
          // Check if positions match exactly (same line and column range)
          const refRange = ref.location.identifierRange;
          const nodeRange = firstNode.location.identifierRange;
          if (
            firstNode.name === ref.name &&
            nodeRange.startLine === refRange.startLine &&
            nodeRange.startColumn === refRange.startColumn &&
            nodeRange.endColumn === refRange.endColumn
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Resolve a same-file symbol reference to its definition
   * Uses the symbol table's scope hierarchy and lookup methods to find the target symbol
   * @param ref The symbol reference to resolve
   * @param containingScope The scope containing the reference
   * @param scopeHierarchy The full scope hierarchy from root to containing scope
   * @returns The resolved symbol, or null if not found in same file
   */
  private resolveSameFileReference(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    scopeHierarchy: ScopeSymbol[],
  ): ApexSymbol | null {
    const allSymbols = this.symbolTable.getAllSymbols();

    switch (ref.context) {
      case ReferenceContext.VARIABLE_USAGE:
        // Resolve variable/parameter/field using scope-based lookup
        // Search from innermost scope outward, prioritizing variables/parameters over fields
        return this.resolveVariableUsage(
          ref,
          containingScope,
          scopeHierarchy,
          allSymbols,
        );

      case ReferenceContext.METHOD_CALL:
        // Resolve method call - search in containing class/scope
        return this.resolveMethodCall(ref, containingScope, allSymbols);

      case ReferenceContext.FIELD_ACCESS:
        // Resolve field/property access
        return this.resolveFieldAccess(ref, containingScope, allSymbols);

      case ReferenceContext.CONSTRUCTOR_CALL:
        // Resolve constructor call - find constructor in same file
        return this.resolveConstructorCall(ref, allSymbols);

      case ReferenceContext.CLASS_REFERENCE:
      case ReferenceContext.TYPE_DECLARATION:
      case ReferenceContext.PARAMETER_TYPE:
      case ReferenceContext.RETURN_TYPE:
        // Resolve type references - find class/interface in same file
        return this.resolveTypeReference(ref, allSymbols);

      case ReferenceContext.VARIABLE_DECLARATION:
      case ReferenceContext.PROPERTY_REFERENCE:
        // These are declaration references - resolve to the declared symbol itself
        return this.resolveDeclarationReference(
          ref,
          containingScope,
          scopeHierarchy,
          allSymbols,
        );

      case ReferenceContext.CHAINED_TYPE:
        // For chained references like "ScopeExample.method4" or "base64Data.toString()",
        // resolve the entire chain to the final member (method/property)
        if (
          isChainedSymbolReference(ref) &&
          ref.chainNodes &&
          ref.chainNodes.length >= 2
        ) {
          const firstNode = ref.chainNodes[0];
          const lastNode = ref.chainNodes[ref.chainNodes.length - 1];

          // First, try to resolve the first node as a variable (for cases like "base64Data.toString()")
          const nodePosition = {
            line: firstNode.location.identifierRange.startLine,
            character: firstNode.location.identifierRange.startColumn,
          };
          const nodeScopeHierarchy =
            this.symbolTable.getScopeHierarchy(nodePosition);
          const nodeContainingScope =
            nodeScopeHierarchy.length > 0
              ? nodeScopeHierarchy[nodeScopeHierarchy.length - 1]
              : null;

          // Try to resolve as variable first (scope-based lookup)
          let firstNodeSymbol = this.symbolTable.lookup(
            firstNode.name,
            nodeContainingScope,
          );
          if (
            firstNodeSymbol &&
            (firstNodeSymbol.kind === SymbolKind.Variable ||
              firstNodeSymbol.kind === SymbolKind.Parameter ||
              firstNodeSymbol.kind === SymbolKind.Field ||
              firstNodeSymbol.kind === SymbolKind.Property)
          ) {
            // First node is a variable - resolve the method on the variable's type
            firstNode.resolvedSymbolId = firstNodeSymbol.id;

            // Get the variable's type
            const variableType =
              firstNodeSymbol.kind === SymbolKind.Variable ||
              firstNodeSymbol.kind === SymbolKind.Parameter
                ? (firstNodeSymbol as VariableSymbol).type
                : firstNodeSymbol.kind === SymbolKind.Field ||
                    firstNodeSymbol.kind === SymbolKind.Property
                  ? (firstNodeSymbol as any).type
                  : null;

            // For built-in types (like String, Integer, etc.), methods are not in the same file
            // So we only resolve the variable itself and let runtime resolution handle the method
            // For same-file types, try to resolve the method
            if (
              variableType &&
              lastNode.context === ReferenceContext.METHOD_CALL &&
              !variableType.isBuiltIn
            ) {
              // Find the method on the variable's type (only for same-file types)
              const typeName = variableType.name;
              const typeSymbol = allSymbols.find(
                (s) =>
                  s.name === typeName &&
                  (s.kind === SymbolKind.Class ||
                    s.kind === SymbolKind.Interface),
              );

              if (typeSymbol) {
                // Find the class block for the type
                const typeClassBlock = allSymbols.find(
                  (s) =>
                    isBlockSymbol(s) &&
                    s.scopeType === 'class' &&
                    s.parentId === typeSymbol.id,
                ) as ScopeSymbol | undefined;

                if (typeClassBlock) {
                  // Find the method in the type's class block
                  const methodSymbol = allSymbols.find(
                    (s) =>
                      s.kind === SymbolKind.Method &&
                      s.name === lastNode.name &&
                      s.parentId === typeClassBlock.id,
                  );
                  if (methodSymbol) {
                    // Resolve the last node to the method
                    lastNode.resolvedSymbolId = methodSymbol.id;
                    return methodSymbol;
                  }
                }
              }
            }

            // For built-in types or if method not found, just resolve the variable itself
            // The runtime resolution will handle finding methods on built-in types
            return firstNodeSymbol;
          }

          // If not a variable, try to resolve as a class/type (for cases like "ScopeExample.method4")
          const qualifierSymbol = this.resolveTypeReference(
            firstNode,
            allSymbols,
          );
          if (!qualifierSymbol) {
            return null;
          }

          // Resolve the first node (qualifier) to its symbol
          firstNode.resolvedSymbolId = qualifierSymbol.id;

          // Find the class block associated with the qualifier symbol
          const classBlock = allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              s.parentId === qualifierSymbol.id,
          ) as ScopeSymbol | undefined;

          if (!classBlock) {
            return null;
          }

          // Then, resolve the member (last node) within that class block
          // Check if the last node is a method call
          if (lastNode.context === ReferenceContext.METHOD_CALL) {
            // Find the method in the qualifier class's block
            const methodSymbol = allSymbols.find(
              (s) =>
                s.kind === SymbolKind.Method &&
                s.name === lastNode.name &&
                s.parentId === classBlock.id,
            );
            if (methodSymbol) {
              // Resolve the last node to the method
              lastNode.resolvedSymbolId = methodSymbol.id;
              return methodSymbol;
            }
          } else if (lastNode.context === ReferenceContext.FIELD_ACCESS) {
            // Find the field/property in the qualifier class's block
            const fieldSymbol = allSymbols.find(
              (s) =>
                (s.kind === SymbolKind.Field ||
                  s.kind === SymbolKind.Property) &&
                s.name === lastNode.name &&
                s.parentId === classBlock.id,
            );
            if (fieldSymbol) {
              // Resolve the last node to the field/property
              lastNode.resolvedSymbolId = fieldSymbol.id;
              return fieldSymbol;
            }
          }

          // If member not found, fall back to resolving just the first node
          return qualifierSymbol;
        } else if (
          isChainedSymbolReference(ref) &&
          ref.chainNodes &&
          ref.chainNodes.length === 1
        ) {
          // Single node chain - try variable first, then type reference
          const nodePosition = {
            line: ref.chainNodes[0].location.identifierRange.startLine,
            character: ref.chainNodes[0].location.identifierRange.startColumn,
          };
          const nodeScopeHierarchy =
            this.symbolTable.getScopeHierarchy(nodePosition);
          const nodeContainingScope =
            nodeScopeHierarchy.length > 0
              ? nodeScopeHierarchy[nodeScopeHierarchy.length - 1]
              : null;

          // Try variable lookup first
          const variableSymbol = this.symbolTable.lookup(
            ref.chainNodes[0].name,
            nodeContainingScope,
          );
          if (
            variableSymbol &&
            (variableSymbol.kind === SymbolKind.Variable ||
              variableSymbol.kind === SymbolKind.Parameter ||
              variableSymbol.kind === SymbolKind.Field ||
              variableSymbol.kind === SymbolKind.Property)
          ) {
            ref.chainNodes[0].resolvedSymbolId = variableSymbol.id;
            return variableSymbol;
          }

          // Fall back to type reference
          const resolved = this.resolveTypeReference(
            ref.chainNodes[0],
            allSymbols,
          );
          if (resolved) {
            ref.chainNodes[0].resolvedSymbolId = resolved.id;
          }
          return resolved;
        }
        return null;

      default:
        // For other contexts, try generic lookup
        return this.symbolTable.lookup(ref.name, containingScope) || null;
    }
  }

  /**
   * Resolve a VARIABLE_USAGE reference using scope-based lookup
   * Prioritizes variables/parameters over fields, respecting lexical scoping
   */
  private resolveVariableUsage(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    scopeHierarchy: ScopeSymbol[],
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    // Search from innermost (most specific) to outermost scope
    const innermostToOutermost = [...scopeHierarchy].reverse();

    for (const scope of innermostToOutermost) {
      // Find symbols in this scope (direct children)
      const symbolsInScope = allSymbols.filter(
        (s) =>
          s.name?.toLowerCase() === ref.name.toLowerCase() &&
          s.parentId === scope.id &&
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field),
      );

      if (symbolsInScope.length > 0) {
        // Prioritize variables/parameters over fields
        const prioritized = symbolsInScope.sort((a, b) => {
          const aIsVar =
            a.kind === SymbolKind.Variable || a.kind === SymbolKind.Parameter;
          const bIsVar =
            b.kind === SymbolKind.Variable || b.kind === SymbolKind.Parameter;
          if (aIsVar && !bIsVar) return -1;
          if (!aIsVar && bIsVar) return 1;
          return 0;
        });
        return prioritized[0];
      }
    }

    // If not found in scopes, try file-level lookup (for fields)
    return this.symbolTable.lookup(ref.name, null) || null;
  }

  /**
   * Resolve a METHOD_CALL reference
   * Searches for methods in the containing class/scope
   */
  private resolveMethodCall(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    // Find the containing class (search up scope hierarchy)
    let currentScope = containingScope;
    while (currentScope) {
      // Check if current scope is a class-level scope
      if (currentScope.scopeType === 'class') {
        // Search for method in this class scope
        const methods = allSymbols.filter(
          (s) =>
            s.name === ref.name &&
            s.parentId === currentScope!.id &&
            (s.kind === SymbolKind.Method || s.kind === SymbolKind.Constructor),
        );
        if (methods.length > 0) {
          // If multiple methods (overloading), prefer non-constructor for now
          // TODO: Improve overload resolution based on parameter types
          return (
            methods.find((m) => m.kind === SymbolKind.Method) || methods[0]
          );
        }
      }

      // Move to parent scope
      if (currentScope.parentId) {
        const parent = allSymbols.find(
          (s) => s.id === currentScope!.parentId && s.kind === SymbolKind.Block,
        ) as ScopeSymbol | undefined;
        currentScope = parent || null;
      } else {
        currentScope = null;
      }
    }

    // Fallback: search all methods in file
    const allMethods = allSymbols.filter(
      (s) =>
        s.name === ref.name &&
        (s.kind === SymbolKind.Method || s.kind === SymbolKind.Constructor),
    );
    return allMethods.length > 0 ? allMethods[0] : null;
  }

  /**
   * Resolve a FIELD_ACCESS reference
   * Searches for fields/properties in the containing class
   */
  private resolveFieldAccess(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    // Find the containing class (search up scope hierarchy)
    let currentScope = containingScope;
    while (currentScope) {
      if (currentScope.scopeType === 'class') {
        // Search for field/property in this class scope
        const fields = allSymbols.filter(
          (s) =>
            s.name === ref.name &&
            s.parentId === currentScope!.id &&
            (s.kind === SymbolKind.Field || s.kind === SymbolKind.Property),
        );
        if (fields.length > 0) {
          return fields[0];
        }
      }

      if (currentScope.parentId) {
        const parent = allSymbols.find(
          (s) => s.id === currentScope!.parentId && s.kind === SymbolKind.Block,
        ) as ScopeSymbol | undefined;
        currentScope = parent || null;
      } else {
        currentScope = null;
      }
    }

    return null;
  }

  /**
   * Resolve a CONSTRUCTOR_CALL reference
   * Finds constructor in same file
   */
  private resolveConstructorCall(
    ref: SymbolReference,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    // First, find the class
    const classSymbol = allSymbols.find(
      (s) =>
        s.name === ref.name &&
        (s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum),
    );

    if (!classSymbol) {
      return null;
    }

    // Find constructor for this class (constructor name matches class name)
    const constructor = allSymbols.find(
      (s) =>
        s.name === ref.name &&
        s.kind === SymbolKind.Constructor &&
        s.parentId === classSymbol.id,
    );

    return constructor || null;
  }

  /**
   * Resolve a type reference (CLASS_REFERENCE, TYPE_DECLARATION, etc.)
   * Finds class/interface in same file
   */
  private resolveTypeReference(
    ref: SymbolReference,
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    return (
      allSymbols.find(
        (s) =>
          s.name === ref.name &&
          (s.kind === SymbolKind.Class ||
            s.kind === SymbolKind.Interface ||
            s.kind === SymbolKind.Enum),
      ) || null
    );
  }

  /**
   * Update type.resolvedSymbol for variable/field/property/parameter declarations
   * that use the resolved TYPE_DECLARATION reference
   */
  private updateTypeResolvedSymbolForDeclarations(
    ref: SymbolReference,
    resolvedTypeSymbol: ApexSymbol,
    scopeHierarchy: ScopeSymbol[],
  ): void {
    const allSymbols = this.symbolTable.getAllSymbols();
    const typeName = ref.name;
    const refLine = ref.location.identifierRange.startLine;

    // Find all variable/field/property/parameter symbols that:
    // 1. Are in the same file
    // 2. Have a type matching this TYPE_DECLARATION reference
    // 3. Are declared on the same line or nearby (within 2 lines) as the reference
    // 4. Are in one of the scopes in the scope hierarchy
    const candidateSymbols = allSymbols.filter((s) => {
      // Must be a variable/field/property/parameter
      if (
        s.kind !== SymbolKind.Variable &&
        s.kind !== SymbolKind.Parameter &&
        s.kind !== SymbolKind.Field &&
        s.kind !== SymbolKind.Property
      ) {
        return false;
      }

      // Must be in the same file
      if (s.fileUri !== this.currentFilePath) {
        return false;
      }

      // Must be declared on the same line or nearby (TYPE_DECLARATION references are typically
      // on the same line as the variable declaration, or within 1-2 lines)
      const symbolLine = s.location.identifierRange.startLine;
      if (Math.abs(symbolLine - refLine) > 2) {
        return false;
      }

      // Must be in one of the scopes in the scope hierarchy
      const isInScopeHierarchy = scopeHierarchy.some(
        (scope) => s.parentId === scope.id,
      );
      if (!isInScopeHierarchy) {
        return false;
      }

      return true;
    });

    // Check each candidate symbol to see if its type matches
    for (const symbol of candidateSymbols) {
      let typeInfo: TypeInfo | undefined;
      if (
        symbol.kind === SymbolKind.Variable ||
        symbol.kind === SymbolKind.Parameter
      ) {
        typeInfo = (symbol as VariableSymbol).type;
      } else if (
        symbol.kind === SymbolKind.Field ||
        symbol.kind === SymbolKind.Property
      ) {
        typeInfo = (symbol as any).type;
      }

      if (typeInfo && typeInfo.name === typeName && !typeInfo.resolvedSymbol) {
        // Set the resolved symbol on the type
        typeInfo.resolvedSymbol = resolvedTypeSymbol;
        this.logger.debug(
          () =>
            '[updateTypeResolvedSymbolForDeclarations] Set type.resolvedSymbol ' +
            `for ${symbol.kind} "${symbol.name}" to ${resolvedTypeSymbol.kind} "${resolvedTypeSymbol.name}"`,
        );
      }
    }
  }

  /**
   * Resolve a declaration reference (VARIABLE_DECLARATION, PROPERTY_REFERENCE)
   * Resolves to the declared symbol itself
   */
  private resolveDeclarationReference(
    ref: SymbolReference,
    containingScope: ScopeSymbol | null,
    scopeHierarchy: ScopeSymbol[],
    allSymbols: ApexSymbol[],
  ): ApexSymbol | null {
    // For VARIABLE_DECLARATION, find the variable symbol
    if (ref.context === ReferenceContext.VARIABLE_DECLARATION) {
      // Search in containing scope for variable with matching name
      const variables = allSymbols.filter(
        (s) =>
          s.name?.toLowerCase() === ref.name.toLowerCase() &&
          s.parentId === containingScope?.id &&
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field),
      );
      return variables.length > 0 ? variables[0] : null;
    }

    // For PROPERTY_REFERENCE, find the property symbol
    if (ref.context === ReferenceContext.PROPERTY_REFERENCE) {
      const properties = allSymbols.filter(
        (s) =>
          s.name === ref.name &&
          s.parentId === containingScope?.id &&
          s.kind === SymbolKind.Property,
      );
      return properties.length > 0 ? properties[0] : null;
    }

    return null;
  }

  /**
   * Validate that methodCallStack is empty after parsing completes
   * This defensive check helps catch any stack leaks from error conditions
   */
  private validateMethodCallStackCleanup(): void {
    if (!this.methodCallStack.isEmpty()) {
      const entries = this.methodCallStack.toArray();
      const remainingEntries = entries.length;
      this.logger.warn(
        () =>
          `methodCallStack is not empty after parsing: ${remainingEntries} entries remaining. ` +
          'This may indicate incomplete cleanup from error conditions.',
      );
      // Log details about remaining entries for debugging
      entries.forEach((entry, index) => {
        this.logger.warn(
          () =>
            `  Entry ${index + 1}: ${entry.callRef.context} "${entry.callRef.name}" ` +
            `at line ${entry.callRef.location.symbolRange.startLine}`,
        );
      });
      // Clear the stack to prevent memory leaks
      this.methodCallStack.clear();
    }
  }
}
