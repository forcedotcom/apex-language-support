/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  MethodCallExpressionContext,
  NewExpressionContext,
  DotExpressionContext,
  TypeRefContext,
  IdPrimaryContext,
  ThisPrimaryContext,
  SuperPrimaryContext,
  PrimaryExpressionContext,
  AssignExpressionContext,
  ArrayExpressionContext,
  CastExpressionContext,
  MethodCallContext,
  DotMethodCallContext,
  AnyIdContext,
  ExpressionListContext,
  TypeArgumentsContext,
  EnhancedForControlContext,
  WhenValueContext,
  InstanceOfExpressionContext,
  TypeRefPrimaryContext,
  LocalVariableDeclarationContext,
  BlockContext,
  ParseTreeWalker,
  // Control structure contexts for scope creation
  IfStatementContext,
  WhileStatementContext,
  ForStatementContext,
  DoWhileStatementContext,
  RunAsStatementContext,
  TryStatementContext,
  CatchClauseContext,
  FinallyBlockContext,
  SwitchStatementContext,
  WhenControlContext,
  GetterContext,
  SetterContext,
  MethodDeclarationContext,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Stack } from 'data-structure-typed';

import { BaseApexParserListener } from './BaseApexParserListener';
import { ApexReferenceCollectorListener, isAssignInsideSObjectConstructor } from './ApexReferenceCollectorListener';
import {
  SymbolReferenceFactory,
  ReferenceContext,
  EnhancedSymbolReference,
} from '../../types/symbolReference';
import type { SymbolReference } from '../../types/symbolReference';
import {
  SymbolTable,
  SymbolLocation,
  SymbolKind,
  SymbolModifiers,
  SymbolVisibility,
  VariableSymbol,
  ScopeSymbol,
  ScopeType,
  SymbolKey,
  ApexSymbol,
  MethodSymbol,
  TypeSymbol,
  SymbolFactory,
} from '../../types/symbol';
import {
  isDotExpressionContext,
  isContextType,
} from '../../utils/contextTypeGuards';
import { HierarchicalReferenceResolver } from '../../types/hierarchicalReference';
import { isBlockSymbol } from '../../utils/symbolNarrowing';
import { TypeInfo } from '../../types/typeInfo';
import { createTypeInfoFromTypeRef as createTypeInfoFromTypeRefUtil } from '../utils/createTypeInfoFromTypeRef';

interface ChainScope {
  isActive: boolean;
  baseExpression: string;
  chainNodes: SymbolReference[];
  startLocation: SymbolLocation;
  parentScope?: ChainScope;
}

/**
 * Listener that handles all block-level symbol table population (Layer 4).
 * This includes:
 * - Local variable symbols (VariableSymbol creation)
 * - Local variable type references
 * - Block scopes (ScopeSymbol creation)
 * - Expression references (method calls, assignments, etc.)
 *
 * This layer is orthogonal to visibility - it handles all block content regardless
 * of which visibility layer processed the containing method/constructor.
 *
 * Uses parse tree traversal to determine parent context (method name, type name).
 */
export class BlockContentListener extends BaseApexParserListener<SymbolTable> {
  private readonly logger = getLogger();
  private symbolTable: SymbolTable;
  private currentFilePath: string = '';
  private suppressAssignmentLHS: boolean = false;
  private suppressedLHSRange: SymbolLocation | null = null;

  // Stack-based method/constructor call tracking
  private methodCallStack: Stack<{
    callRef: SymbolReference;
    parameterRefs: SymbolReference[];
  }> = new Stack();

  private hierarchicalResolver = new HierarchicalReferenceResolver();

  // Chain expression scope for capturing complete chains as single units
  private chainExpressionScope: ChainScope | null = null;

  // Scope tracking for block-level symbols
  private scopeStack: Stack<ApexSymbol> = new Stack<ApexSymbol>();
  private blockCounter: number = 0;

  constructor(symbolTable: SymbolTable) {
    super();
    this.symbolTable = symbolTable;
  }

  setCurrentFileUri(fileUri: string): void {
    this.currentFilePath = fileUri;
    this.symbolTable.setFileUri(fileUri);
    this.logger.debug(() => `Set current file path to: ${fileUri}`);
  }

  setErrorListener(errorListener: any): void {
    // Error listener support inherited from BaseApexParserListener
    super.setErrorListener(errorListener);
  }

  getResult(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Determine parent context (method name or type name) by traversing parse tree
   * This is the primary method for context determination - no setParentContext needed
   */
  private determineParentContext(ctx: ParserRuleContext): string | undefined {
    let current: ParserRuleContext | undefined = ctx.parent;

    while (current) {
      const name = current.constructor.name;

      // Check for method-related contexts
      if (
        name === 'MethodDeclarationContext' ||
        name === 'ConstructorDeclarationContext' ||
        name === 'InterfaceMethodDeclarationContext'
      ) {
        return this.extractMethodName(current);
      }

      // Check for type declaration contexts (for class-level expressions)
      if (
        name === 'ClassDeclarationContext' ||
        name === 'InterfaceDeclarationContext'
      ) {
        const typeId = (current as any).id?.();
        return typeId?.text;
      }

      current = current.parent;
    }

    // Fallback: check scope stack for method
    const method = this.getCurrentMethod();
    if (method) {
      return method.name;
    }

    return undefined;
  }

  /**
   * Extract method name from method/constructor declaration context
   */
  private extractMethodName(ctx: ParserRuleContext): string | undefined {
    if (ctx.constructor.name === 'MethodDeclarationContext') {
      return (ctx as any).id?.()?.text;
    } else if (ctx.constructor.name === 'ConstructorDeclarationContext') {
      const qualifiedName = (ctx as any).qualifiedName?.();
      const ids = qualifiedName?.id();
      return ids && ids.length > 0 ? ids[0].text : undefined;
    } else if (ctx.constructor.name === 'InterfaceMethodDeclarationContext') {
      return (ctx as any).id?.()?.text;
    }
    return undefined;
  }

  /**
   * Get current method name from parse tree or method call stack
   */
  private getCurrentMethodName(ctx?: ParserRuleContext): string | undefined {
    // If context provided, traverse parse tree
    if (ctx) {
      return this.determineParentContext(ctx);
    }
    // Fall back to methodCallStack for nested method calls within expressions
    const stackEntry = this.methodCallStack.peek();
    return stackEntry?.callRef.parentContext;
  }

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
      // Capture the constructor call reference first
      this.captureConstructorCallReference(ctx);

      // Delegate type reference collection (including generic type parameters) to reference collector
      // This ensures enterTypeArguments is called correctly for generic constructor calls
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      const parentContext = this.getCurrentMethodName(ctx);
      const typeName = this.determineTypeName(ctx);
      refCollector.setParentContext(parentContext, typeName);
      walker.walk(refCollector, ctx); // Walk the entire NewExpressionContext subtree
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
      const stackEntry = this.methodCallStack.peek();
      if (
        stackEntry &&
        stackEntry.callRef.context === ReferenceContext.CONSTRUCTOR_CALL
      ) {
        const popped = this.methodCallStack.pop();
        if (popped) {
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
   * Capture dot expressions (e.g., "obj.field")
   */
  enterDotExpression(ctx: DotExpressionContext): void {
    try {
      // Skip if this is part of an assignment LHS (handled in enterAssignExpression)
      if (this.shouldSuppress(ctx)) {
        return;
      }
      this.captureDotExpressionReference(ctx);
    } catch (error) {
      this.logger.warn(() => `Error capturing dot expression: ${error}`);
    }
  }

  /**
   * Capture method call references
   */
  enterMethodCall(ctx: MethodCallContext): void {
    let pushed = false;
    try {
      const idNode = ctx.id();
      const methodName = idNode?.text || 'unknownMethod';
      const location = idNode
        ? this.getLocationForReference(idNode)
        : this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName(ctx);

      const reference = SymbolReferenceFactory.createMethodCallReference(
        methodName,
        location,
        parentContext,
      );

      this.methodCallStack.push({
        callRef: reference,
        parameterRefs: [],
      });
      pushed = true;

      this.symbolTable.addTypeReference(reference);
    } catch (error) {
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
   */
  exitMethodCall(ctx: MethodCallContext): void {
    try {
      const stackEntry = this.methodCallStack.pop();
      if (stackEntry) {
        const parentEntry = this.methodCallStack.peek();
        if (parentEntry) {
          parentEntry.parameterRefs.push(stackEntry.callRef);
        }
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
        ? this.getLocationForReference(anyIdNode)
        : this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName(ctx);

      const reference = SymbolReferenceFactory.createMethodCallReference(
        methodName,
        methodLocation,
        parentContext,
      );

      this.methodCallStack.push({
        callRef: reference,
        parameterRefs: [],
      });
      pushed = true;

      if (this.chainExpressionScope?.isActive) {
        // Chain finalization will create and add the chained reference to symbol table
        this.chainExpressionScope.chainNodes.push(
          this.createExpressionNode(
            methodName,
            methodLocation,
            ReferenceContext.METHOD_CALL,
          ),
        );
        // Do NOT add individual reference to symbol table - chain finalization handles it
        // The individual reference is still used for methodCallStack (parameter tracking) above
      } else {
        this.processStandaloneMethodCall(ctx, methodName, methodLocation);
        // Add to symbol table
        this.symbolTable.addTypeReference(reference);
      }
    } catch (error) {
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
        const parentEntry = this.methodCallStack.peek();
        if (parentEntry) {
          parentEntry.parameterRefs.push(stackEntry.callRef);
        }
      }
    } catch (error) {
      this.logger.warn(() => `Error exiting DotMethodCall: ${error}`);
    }
  }

  /**
   * Check if anyId should be skipped - anyId is never a variable usage.
   * It appears in: constructor types (new Foo()), method names (System.debug),
   * field accesses (obj.field). All are handled by other listeners/references.
   * Uses parser context types (NewExpressionContext, isDotExpressionContext).
   */
  private isAnyIdInTypeOrMethodOrFieldContext(ctx: AnyIdContext): boolean {
    const parent = ctx.parent;
    if (!parent) return false;

    // Method name or field access: "debug" in System.debug, "x" in f.getB().x
    if (isDotExpressionContext(parent)) return true;

    // Constructor type: "Foo" in "new Foo()" - walk up to find NewExpressionContext
    let p: ParserRuleContext | undefined = parent;
    for (let i = 0; i < 10 && p; i++) {
      if (isContextType(p, NewExpressionContext)) return true;
      p = p.parent;
    }
    return false;
  }

  /**
   * Capture any ID references (variable usage, etc.)
   */
  enterAnyId(ctx: AnyIdContext): void {
    try {
      if (this.shouldSuppress(ctx)) {
        return;
      }

      // Skip: anyId is used for type/method/field names, never variable usage
      if (this.isAnyIdInTypeOrMethodOrFieldContext(ctx)) {
        return;
      }

      const idText = ctx.text || '';
      const location = this.getLocationForReference(ctx);
      const parentContext = this.getCurrentMethodName(ctx);

      // Check if this is a method call parameter
      if (this.isMethodCallParameter(ctx)) {
        const varRef = SymbolReferenceFactory.createVariableUsageReference(
          idText,
          location,
          parentContext,
        );
        this.addToCurrentMethodParameters(varRef);
        this.symbolTable.addTypeReference(varRef);
        return;
      }

      // Regular variable usage
      const varRef = SymbolReferenceFactory.createVariableUsageReference(
        idText,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(varRef);
    } catch (error) {
      this.logger.warn(() => `Error capturing AnyId: ${error}`);
    }
  }

  /**
   * Capture ID primary references
   */
  enterIdPrimary(ctx: IdPrimaryContext): void {
    try {
      if (this.shouldSuppress(ctx)) {
        return;
      }

      const idNode = ctx.id();
      if (!idNode) {
        return;
      }

      const idText = idNode.text || '';
      const location = this.getLocationForReference(idNode);
      const parentContext = this.getCurrentMethodName(ctx);

      // Skip when inside dot expression (e.g., System in System.debug, obj in obj.field)
      // Dot/chain handling creates the appropriate reference for the base
      if (!this.isMethodCallParameter(ctx)) {
        let parent: ParserRuleContext | undefined = ctx.parent;
        while (parent) {
          if (isDotExpressionContext(parent)) return;
          parent = parent.parent;
        }
      }

      // Check if this is a method call parameter
      if (this.isMethodCallParameter(ctx)) {
        const varRef = SymbolReferenceFactory.createVariableUsageReference(
          idText,
          location,
          parentContext,
        );
        this.addToCurrentMethodParameters(varRef);
        this.symbolTable.addTypeReference(varRef);
        return;
      }

      // Regular variable usage
      const varRef = SymbolReferenceFactory.createVariableUsageReference(
        idText,
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(varRef);
    } catch (error) {
      this.logger.warn(() => `Error capturing IdPrimary: ${error}`);
    }
  }

  /**
   * Capture primary expression references
   */
  enterPrimaryExpression(ctx: PrimaryExpressionContext): void {
    // No-op: handled by specific primary contexts (IdPrimary, ThisPrimary, etc.)
  }

  /**
   * Capture this references
   */
  enterThisPrimary(ctx: ThisPrimaryContext): void {
    try {
      const location = this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName(ctx);
      const reference = SymbolReferenceFactory.createVariableUsageReference(
        'this',
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
    } catch (error) {
      this.logger.warn(() => `Error capturing ThisPrimary: ${error}`);
    }
  }

  /**
   * Capture super references
   */
  enterSuperPrimary(ctx: SuperPrimaryContext): void {
    try {
      const location = this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName(ctx);
      const reference = SymbolReferenceFactory.createVariableUsageReference(
        'super',
        location,
        parentContext,
      );
      this.symbolTable.addTypeReference(reference);
    } catch (error) {
      this.logger.warn(() => `Error capturing SuperPrimary: ${error}`);
    }
  }

  /**
   * Capture assignment expression references
   */
  enterAssignExpression(ctx: AssignExpressionContext): void {
    try {
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
      const lhsAccess: 'write' | 'readwrite' = isCompound
        ? 'readwrite'
        : 'write';

      const expressions = (ctx as any).expression?.();
      const leftExpression =
        Array.isArray(expressions) && expressions.length > 0
          ? expressions[0]
          : (expressions ?? null);

      if (leftExpression) {
        const lhsLoc = this.getLocation(
          leftExpression as unknown as ParserRuleContext,
        );
        const parentContext = this.getCurrentMethodName(ctx);

        // Suppress child captures within LHS range
        this.suppressAssignmentLHS = true;
        this.suppressedLHSRange = lhsLoc;

        // If it's a simple identifier, mark as write/readwrite
        if (isContextType(leftExpression, PrimaryExpressionContext)) {
          // SObject constructor field initializer: `new Account(Name = 'value')`.
          // The LHS identifier is a field name, not a variable — skip the variable reference.
          if (!isAssignInsideSObjectConstructor(ctx)) {
            const identifiers =
              this.extractIdentifiersFromExpression(leftExpression);
            if (identifiers.length > 0) {
              const varRef = SymbolReferenceFactory.createVariableUsageReference(
                identifiers[0],
                lhsLoc,
                parentContext,
                lhsAccess,
              );
              this.symbolTable.addTypeReference(varRef);
            }
          }
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/0f486e81-d99b-4936-befb-74177d662c21',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'371dcb'},body:JSON.stringify({sessionId:'371dcb',runId:'run5',hypothesisId:'H-BCL-assign',location:'BlockContentListener.ts:enterAssignExpression',message:'BCL SObject constructor field suppression',data:{lhsText:(leftExpression as any).text,isSObjectConstructor:isAssignInsideSObjectConstructor(ctx)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
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
              const objectIdentifiers =
                this.extractIdentifiersFromExpression(objectExpr);
              const objLocation = lhsLoc;
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
              const fieldRef =
                SymbolReferenceFactory.createFieldAccessReference(
                  fieldName,
                  lhsLoc,
                  objectIdentifiers[0] || 'unknown',
                  parentContext,
                  lhsAccess,
                );
              this.symbolTable.addTypeReference(fieldRef);
            }
          }
          return;
        }

        // If it's an array expression: arr[i] or obj.field[0]
        if (isContextType(leftExpression, ArrayExpressionContext)) {
          const arrayExpr = leftExpression;
          const expressions = (arrayExpr as any).expression?.();
          const arrayBaseExpression =
            Array.isArray(expressions) && expressions.length > 0
              ? expressions[0]
              : (expressions ?? null);

          if (arrayBaseExpression) {
            const arrayBaseIdentifiers =
              this.extractIdentifiersFromExpression(arrayBaseExpression);
            const arrayBaseLocation = this.getLocation(
              arrayBaseExpression as unknown as ParserRuleContext,
            );
            for (const identifier of arrayBaseIdentifiers) {
              const arrayRef =
                SymbolReferenceFactory.createVariableUsageReference(
                  identifier,
                  arrayBaseLocation,
                  parentContext,
                  'read',
                );
              this.symbolTable.addTypeReference(arrayRef);
            }
          }

          const indexExpression = (arrayExpr as any).expression?.(1);
          if (indexExpression) {
            const indexIdentifiers =
              this.extractIdentifiersFromExpression(indexExpression);
            const indexLocation = this.getLocation(
              indexExpression as unknown as ParserRuleContext,
            );
            for (const identifier of indexIdentifiers) {
              const indexRef =
                SymbolReferenceFactory.createVariableUsageReference(
                  identifier,
                  indexLocation,
                  parentContext,
                  'read',
                );
              this.symbolTable.addTypeReference(indexRef);
            }
          }
          return;
        }
      }
    } catch (error) {
      this.logger.warn(() => `Error entering assign expression: ${error}`);
    }
  }

  exitAssignExpression(): void {
    this.suppressAssignmentLHS = false;
    this.suppressedLHSRange = null;
  }

  /**
   * Capture array expression references
   */
  enterArrayExpression(ctx: ArrayExpressionContext): void {
    try {
      const expressions = (ctx as any).expression?.();
      const arrayExpression =
        Array.isArray(expressions) && expressions.length > 0
          ? expressions[0]
          : (expressions ?? null);

      if (arrayExpression && !this.shouldSuppress(ctx)) {
        const identifiers =
          this.extractIdentifiersFromExpression(arrayExpression);
        const location = this.getLocation(ctx);
        const parentContext = this.getCurrentMethodName(ctx);

        for (const identifier of identifiers) {
          const varRef = SymbolReferenceFactory.createVariableUsageReference(
            identifier,
            location,
            parentContext,
            'read',
          );
          this.symbolTable.addTypeReference(varRef);
        }
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing array expression: ${error}`);
    }
  }

  /**
   * Capture cast expression references
   */
  enterCastExpression(ctx: CastExpressionContext): void {
    try {
      // Delegate type reference collection (including generic type parameters) to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      const parentContext = this.getCurrentMethodName(ctx);
      const typeName = this.determineTypeName(ctx);
      refCollector.setParentContext(parentContext, typeName);
      walker.walk(refCollector, ctx); // Walk the entire CastExpressionContext subtree
    } catch (error) {
      this.logger.warn(() => `Error capturing cast expression: ${error}`);
    }
  }

  /**
   * Capture enhanced for control type references and create variable symbol for loop variable
   * e.g. for (GeocodingAddress address : addresses) - creates VariableSymbol for "address"
   */
  enterEnhancedForControl(ctx: EnhancedForControlContext): void {
    try {
      const typeRef = ctx.typeRef();
      const idNode = ctx.id();
      if (typeRef && idNode) {
        const variableName = idNode.text;
        if (variableName) {
          const currentScope = this.getCurrentScopeSymbol(ctx);
          const existingVariable = this.symbolTable.findSymbolInCurrentScope(
            variableName,
            currentScope,
          );
          if (
            !existingVariable ||
            existingVariable.kind !== SymbolKind.Variable
          ) {
            const type = this.createTypeInfoFromTypeRef(typeRef);
            const modifiers = this.createDefaultModifiers();
            const variableSymbol = this.createVariableSymbol(
              idNode as unknown as ParserRuleContext,
              modifiers,
              variableName,
              SymbolKind.Variable,
              type,
            );
            this.symbolTable.addSymbol(variableSymbol, currentScope);
          }
        }
      }

      // Delegate type reference collection (including generic type parameters) to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      const parentContext = this.getCurrentMethodName(ctx);
      const typeName = this.determineTypeName(ctx);
      refCollector.setParentContext(parentContext, typeName);
      walker.walk(refCollector, ctx); // Walk the entire EnhancedForControlContext subtree
    } catch (error) {
      this.logger.warn(() => `Error capturing enhanced for control: ${error}`);
    }
  }

  /**
   * Capture when value references in switch statements (e.g., "when Type var")
   */
  enterWhenValue(ctx: WhenValueContext): void {
    try {
      // Delegate type reference collection (including generic type parameters) to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      const parentContext = this.getCurrentMethodName(ctx);
      const typeName = this.determineTypeName(ctx);
      refCollector.setParentContext(parentContext, typeName);
      walker.walk(refCollector, ctx); // Walk the entire WhenValueContext subtree
    } catch (error) {
      this.logger.warn(() => `Error capturing when value: ${error}`);
    }
  }

  /**
   * Capture instanceof expression references (e.g., "obj instanceof Type")
   */
  enterInstanceOfExpression(ctx: InstanceOfExpressionContext): void {
    try {
      // Delegate type reference collection (including generic type parameters) to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      const parentContext = this.getCurrentMethodName(ctx);
      const typeName = this.determineTypeName(ctx);
      refCollector.setParentContext(parentContext, typeName);
      walker.walk(refCollector, ctx); // Walk the entire InstanceOfExpressionContext subtree
    } catch (error) {
      this.logger.warn(() => `Error capturing instanceof expression: ${error}`);
    }
  }

  /**
   * Capture type ref primary references (e.g., "String.class")
   */
  enterTypeRefPrimary(ctx: TypeRefPrimaryContext): void {
    try {
      // Delegate type reference collection (including generic type parameters) to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      const parentContext = this.getCurrentMethodName(ctx);
      const typeName = this.determineTypeName(ctx);
      refCollector.setParentContext(parentContext, typeName);
      walker.walk(refCollector, ctx); // Walk the entire TypeRefPrimaryContext subtree
    } catch (error) {
      this.logger.warn(() => `Error capturing type ref primary: ${error}`);
    }
  }

  /**
   * Capture type arguments in expressions (generic type parameters)
   * NOTE: Type argument collection is delegated to ApexReferenceCollectorListener
   * via enterNewExpression delegation. This method is not used directly.
   */
  enterTypeArguments(_ctx: TypeArgumentsContext): void {
    // No-op: Delegated to ApexReferenceCollectorListener
  }

  /**
   * Capture expression list references (method call parameters)
   */
  enterExpressionList(ctx: ExpressionListContext): void {
    // No-op: individual expressions are captured by their specific enter methods
  }

  // Helper methods (copied from ApexReferenceCollectorListener)

  private captureConstructorCallReference(ctx: NewExpressionContext): void {
    const typeRef = (ctx as any).typeRef?.();
    if (!typeRef) {
      return;
    }

    const typeName = this.extractTypeNameFromTypeRef(typeRef);
    const location = this.getLocation(ctx);
    const parentContext = this.getCurrentMethodName(ctx);

    const reference = SymbolReferenceFactory.createConstructorCallReference(
      typeName,
      location,
      parentContext,
    );

    this.methodCallStack.push({
      callRef: reference,
      parameterRefs: [],
    });

    this.symbolTable.addTypeReference(reference);
  }

  private captureDotExpressionReference(ctx: DotExpressionContext): void {
    const anyId = ctx.anyId();
    if (!anyId) {
      return;
    }

    const fieldName = this.getTextFromContext(anyId);
    const fieldLocation = this.getLocationForReference(anyId);
    const objectExpr = ctx.expression();
    const parentContext = this.getCurrentMethodName(ctx);

    if (objectExpr) {
      const objectIdentifiers =
        this.extractIdentifiersFromExpression(objectExpr);
      // Do not create VARIABLE_USAGE for the base - it may be a class (SomeClass.STATIC_FIELD)
      // or variable (obj.field). Field access resolution handles both via the object name

      const fieldRef = SymbolReferenceFactory.createFieldAccessReference(
        fieldName,
        fieldLocation,
        objectIdentifiers[0] || 'unknown',
        parentContext,
        'read',
      );
      this.symbolTable.addTypeReference(fieldRef);
    }
  }

  private processStandaloneMethodCall(
    ctx: DotMethodCallContext,
    methodName: string,
    methodLocation: SymbolLocation,
  ): void {
    try {
      const parentContext = this.getCurrentMethodName(ctx);
      const dotParent = ctx.parent;
      if (dotParent && isDotExpressionContext(dotParent)) {
        const expressions = (dotParent as any).expression?.();
        const leftExpression =
          Array.isArray(expressions) && expressions.length > 0
            ? expressions[0]
            : (expressions ?? null);

        if (leftExpression) {
          const qualifier = this.extractQualifierFromExpression(leftExpression);
          const qualifierLocation = this.getLocation(
            leftExpression as unknown as ParserRuleContext,
          );

          // Qualifier in qualified method calls is typically a class (System.debug, Assert.areEqual)
          const classRef = SymbolReferenceFactory.createClassReference(
            qualifier,
            qualifierLocation,
            parentContext,
          );
          this.symbolTable.addTypeReference(classRef);
        }
      } else {
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

  private addToCurrentMethodParameters(ref: SymbolReference): void {
    const stackEntry = this.methodCallStack.peek();
    if (stackEntry) {
      stackEntry.parameterRefs.push(ref);
    }
  }

  private shouldSuppress(ctx: ParserRuleContext): boolean {
    if (!this.suppressAssignmentLHS) {
      return false;
    }

    if (!this.suppressedLHSRange) {
      return false;
    }

    const ctxLocation = this.getLocation(ctx);
    const suppressedRange = this.suppressedLHSRange.identifierRange;
    const ctxRange = ctxLocation.identifierRange;

    return (
      ctxRange.startLine === suppressedRange.startLine &&
      ctxRange.startColumn >= suppressedRange.startColumn &&
      ctxRange.endColumn <= suppressedRange.endColumn
    );
  }

  private isMethodCallParameter(ctx: ParserRuleContext): boolean {
    let current: ParserRuleContext | undefined = ctx.parent;
    while (current) {
      if (
        current.constructor.name === 'ExpressionListContext' ||
        current.constructor.name === 'ArgumentsContext'
      ) {
        const grandParent = current.parent;
        if (
          grandParent &&
          (grandParent.constructor.name === 'MethodCallContext' ||
            grandParent.constructor.name === 'DotMethodCallContext' ||
            grandParent.constructor.name === 'NewExpressionContext')
        ) {
          return true;
        }
      }
      current = current.parent;
    }
    return false;
  }

  private extractTypeNameFromTypeRef(typeRef: TypeRefContext): string {
    const typeNames = typeRef.typeName();
    if (typeNames && typeNames.length > 0) {
      const typeName = typeNames[0];
      const ids = typeName.id();
      if (ids) {
        // ids can be a single IdContext or an array
        if (Array.isArray(ids) && ids.length > 0) {
          return ids.map((id) => id.text).join('.');
        } else if (!Array.isArray(ids) && ids.text) {
          return ids.text;
        }
      }
    }
    return typeRef.text || '';
  }

  private extractIdentifiersFromExpression(expr: any): string[] {
    const identifiers: string[] = [];

    if (isContextType(expr, IdPrimaryContext)) {
      const idNode = (expr as IdPrimaryContext).id();
      if (idNode) {
        identifiers.push(idNode.text || '');
      }
    } else if (isContextType(expr, AnyIdContext)) {
      identifiers.push(expr.text || '');
    } else if (isContextType(expr, DotExpressionContext)) {
      const dotExpr = expr as DotExpressionContext;
      const objectExpr = dotExpr.expression();
      if (objectExpr) {
        const objectIds = this.extractIdentifiersFromExpression(objectExpr);
        identifiers.push(...objectIds);
      }
    } else if (isContextType(expr, ArrayExpressionContext)) {
      const arrayExpr = expr as ArrayExpressionContext;
      const expressions = (arrayExpr as any).expression?.();
      const arrayBaseExpression =
        Array.isArray(expressions) && expressions.length > 0
          ? expressions[0]
          : (expressions ?? null);
      if (arrayBaseExpression) {
        const arrayIds =
          this.extractIdentifiersFromExpression(arrayBaseExpression);
        identifiers.push(...arrayIds);
      }
    } else if (isContextType(expr, PrimaryExpressionContext)) {
      const primaryExpr = expr as PrimaryExpressionContext;
      const primary = primaryExpr.primary();
      if (primary) {
        const primaryIds = this.extractIdentifiersFromExpression(primary);
        identifiers.push(...primaryIds);
      }
    }

    return identifiers;
  }

  private extractQualifierFromExpression(expr: any): string {
    const identifiers = this.extractIdentifiersFromExpression(expr);
    return identifiers[0] || 'unknown';
  }

  private createExpressionNode(
    name: string,
    location: SymbolLocation,
    context: ReferenceContext,
  ): EnhancedSymbolReference {
    return {
      name,
      location,
      context,
      parentContext: this.getCurrentMethodName(),
    } as EnhancedSymbolReference;
  }

  private getLocation(ctx: ParserRuleContext): SymbolLocation {
    const start = ctx.start;
    const stop = ctx.stop || start;

    return {
      symbolRange: {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + (stop.text?.length || 0),
      },
      identifierRange: {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + (stop.text?.length || 0),
      },
    };
  }

  private getLocationForReference(ctx: any): SymbolLocation {
    // Handle TerminalNode (from id() calls) - has symbol property instead of start/stop
    if (ctx.symbol && typeof ctx.symbol.line === 'number') {
      const token = ctx.symbol;
      const text = ctx.text || token.text || '';
      return {
        symbolRange: {
          startLine: token.line,
          startColumn: token.charPositionInLine,
          endLine: token.line,
          endColumn: token.charPositionInLine + text.length,
        },
        identifierRange: {
          startLine: token.line,
          startColumn: token.charPositionInLine,
          endLine: token.line,
          endColumn: token.charPositionInLine + text.length,
        },
      };
    }

    // Handle ParserRuleContext - has start and stop properties
    if (ctx.start && ctx.stop) {
      return this.getLocation(ctx as ParserRuleContext);
    }

    // Fallback: try to use as ParserRuleContext anyway
    return this.getLocation(ctx as ParserRuleContext);
  }

  private getTextFromContext(ctx: ParserRuleContext): string {
    return ctx.text || '';
  }

  /**
   * Called when entering a local variable declaration
   * Creates VariableSymbol objects and delegates type reference collection
   */
  enterLocalVariableDeclaration(ctx: LocalVariableDeclarationContext): void {
    try {
      const typeRef = ctx.typeRef();
      if (!typeRef) {
        return;
      }

      const type = this.createTypeInfoFromTypeRef(typeRef);
      const modifiers = this.createDefaultModifiers();
      const declarators = ctx.variableDeclarators()?.variableDeclarator() || [];

      for (const declarator of declarators) {
        const name = declarator.id()?.text;
        if (!name) {
          continue;
        }

        // Check if variable already exists (from ApexSymbolCollectorListener)
        // to prevent duplicate variable symbols
        // Pass ctx to getCurrentScopeSymbol to enable parse tree traversal fallback
        const currentScope = this.getCurrentScopeSymbol(ctx);
        const existingVariable = this.symbolTable.findSymbolInCurrentScope(
          name,
          currentScope,
        );
        if (existingVariable && existingVariable.kind === SymbolKind.Variable) {
          // Variable already exists, skip creating a duplicate
          continue;
        }

        // Fallback: check by location in case scope matching fails (e.g. different
        // scope paths between ApexSymbolCollectorListener and BlockContentListener)
        const declaratorLocation = this.getLocation(declarator);
        const fileUri = this.symbolTable.getFileUri();
        const existingByLocation = this.symbolTable.getAllSymbols().find(
          (s) =>
            s.kind === SymbolKind.Variable &&
            s.name === name &&
            (!fileUri || s.fileUri === fileUri) &&
            (() => {
              const loc =
                s.location?.identifierRange ?? s.location?.symbolRange;
              const declLoc =
                declaratorLocation.identifierRange ??
                declaratorLocation.symbolRange;
              if (!loc || !declLoc) return false;
              return (
                loc.startLine === declLoc.startLine &&
                loc.startColumn === declLoc.startColumn
              );
            })(),
        );
        if (existingByLocation) {
          continue;
        }

        // Use declarator context (not ctx) for correct location range
        const variableSymbol = this.createVariableSymbol(
          declarator,
          modifiers,
          name,
          SymbolKind.Variable,
          type,
        );

        this.symbolTable.addSymbol(variableSymbol, currentScope);
      }

      // Delegate reference collection to reference collector
      const walker = new ParseTreeWalker();
      const refCollector = new ApexReferenceCollectorListener(this.symbolTable);
      refCollector.setCurrentFileUri(this.currentFilePath);
      const parentContext = this.determineParentContext(ctx);
      const typeName = this.determineTypeName(ctx);
      refCollector.setParentContext(parentContext, typeName);
      walker.walk(refCollector, ctx); // Walk only this subtree
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        () => `Error in local variable declaration: ${errorMessage}`,
      );
    }
  }

  /**
   * Called when entering a block
   * Creates block scopes for implementation details
   * Note: This creates generic 'block' scopes. Control structures (try, catch, if, etc.)
   * create their own specific scope types via their respective enter handlers.
   */
  enterBlock(ctx: BlockContext): void {
    try {
      // Check if we're already inside a control structure scope
      // If so, this block is part of that control structure and should be a child block
      let currentScope = this.getCurrentScopeSymbol(ctx);

      // Special handling: If we're inside a method body but don't have method block on stack,
      // ensure the method block is found and used as current scope
      // This handles the case where enterMethodDeclaration didn't push the block
      if (
        (!currentScope || currentScope.scopeType !== 'method') &&
        this.scopeStack.isEmpty()
      ) {
        // Check if this block is a method body by traversing parse tree
        let parent: ParserRuleContext | undefined = ctx.parent;
        while (parent) {
          const contextName = parent.constructor.name;
          if (
            contextName === 'MethodDeclarationContext' ||
            contextName === 'ConstructorDeclarationContext'
          ) {
            // We're inside a method body - ensure method block is on stack
            // This handles the case where enterMethodDeclaration didn't push the block
            const methodName = this.extractMethodName(parent);
            if (methodName) {
              const allSymbols = this.symbolTable.getAllSymbols();
              const fileUri = this.symbolTable.getFileUri();

              // Find method symbol
              const currentType = this.getCurrentType(parent);
              let methodSymbol: MethodSymbol | undefined;

              if (currentType) {
                const typeBlock = allSymbols.find(
                  (s) =>
                    isBlockSymbol(s) &&
                    s.scopeType === 'class' &&
                    s.parentId === currentType.id &&
                    s.fileUri === fileUri,
                ) as ScopeSymbol | undefined;

                if (typeBlock) {
                  methodSymbol = allSymbols.find(
                    (s) =>
                      (s.kind === SymbolKind.Method ||
                        s.kind === SymbolKind.Constructor) &&
                      s.name === methodName &&
                      s.fileUri === fileUri &&
                      s.parentId === typeBlock.id,
                  ) as MethodSymbol | undefined;
                }
              }

              if (!methodSymbol) {
                methodSymbol = allSymbols.find(
                  (s) =>
                    (s.kind === SymbolKind.Method ||
                      s.kind === SymbolKind.Constructor) &&
                    s.name === methodName &&
                    s.fileUri === fileUri,
                ) as MethodSymbol | undefined;
              }

              if (methodSymbol) {
                // Find method block
                const methodBlock = allSymbols.find(
                  (s) =>
                    isBlockSymbol(s) &&
                    s.scopeType === 'method' &&
                    s.parentId === methodSymbol!.id &&
                    s.fileUri === fileUri,
                ) as ScopeSymbol | undefined;

                if (
                  methodBlock &&
                  !this.scopeStack.toArray().includes(methodBlock)
                ) {
                  // Push method block onto stack if not already there
                  this.scopeStack.push(methodBlock);
                  currentScope = methodBlock;
                }
              }
            }
            break;
          }
          parent = parent.parent;
        }
      }

      // Skip when this block is the method body (direct child of method/constructor declaration)
      // Check parent context first - method body is already represented by method block from
      // StructureListener/VisibilitySymbolListener. Do not create duplicate block_3.
      const parentCtx = ctx.parent;
      const isMethodBodyBlock =
        parentCtx &&
        (parentCtx.constructor.name === 'MethodDeclarationContext' ||
          parentCtx.constructor.name === 'ConstructorDeclarationContext' ||
          parentCtx.constructor.name === 'InterfaceMethodDeclarationContext');
      if (isMethodBodyBlock) {
        return;
      }

      const isControlStructureBlock =
        currentScope &&
        (currentScope.scopeType === 'try' ||
          currentScope.scopeType === 'catch' ||
          currentScope.scopeType === 'finally' ||
          currentScope.scopeType === 'if' ||
          currentScope.scopeType === 'while' ||
          currentScope.scopeType === 'for' ||
          currentScope.scopeType === 'doWhile' ||
          currentScope.scopeType === 'runAs' ||
          currentScope.scopeType === 'switch' ||
          currentScope.scopeType === 'when' ||
          currentScope.scopeType === 'getter' ||
          currentScope.scopeType === 'setter');

      // Only create a generic block scope if we're not already inside a control structure
      // Control structures create their own scopes, and their block bodies become child blocks
      if (!isControlStructureBlock) {
        const location = this.getLocation(ctx);
        const blockName = this.generateBlockName('block');
        const blockSymbol = this.createBlockSymbol(
          blockName,
          'block',
          location,
          currentScope,
          undefined,
          ctx,
        );

        if (blockSymbol) {
          this.scopeStack.push(blockSymbol);
        }
      } else {
        // We're inside a control structure, create a child block scope
        const location = this.getLocation(ctx);
        const blockName = this.generateBlockName('block');
        const blockSymbol = this.createBlockSymbol(
          blockName,
          'block',
          location,
          currentScope,
          undefined,
          ctx,
        );

        if (blockSymbol) {
          this.scopeStack.push(blockSymbol);
        }
      }
    } catch (_e) {
      // Silently continue - block scope tracking
    }
  }

  exitBlock(): void {
    const top = this.scopeStack.peek();
    if (isBlockSymbol(top) && top.scopeType === 'method') {
      return; // Exiting method body, we didn't push a generic block
    }
    this.scopeStack.pop();
    // No validation needed for generic blocks
  }

  /**
   * Generic method to enter a scope for control structures
   * @param scopeType The type of scope to enter
   * @param ctx The parser context
   */
  private enterScope(scopeType: ScopeType, ctx: ParserRuleContext): void {
    try {
      const name = this.generateBlockName(scopeType);
      const location = this.getLocation(ctx);
      const parentScope = this.getCurrentScopeSymbol(ctx);
      const blockSymbol = this.createBlockSymbol(
        name,
        scopeType,
        location,
        parentScope,
      );

      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        () => `Error in ${scopeType} statement: ${errorMessage}`,
      );
    }
  }

  /**
   * Generic method to exit a scope
   * @param expectedScopeType The expected scope type (for validation)
   */
  private exitScope(expectedScopeType: ScopeType): void {
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped)) {
      if (popped.scopeType !== expectedScopeType) {
        this.logger.warn(
          () =>
            `Expected ${expectedScopeType} scope on exit, but got ${popped.scopeType}`,
        );
      }
    }
  }

  // Control structure scope handlers
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    // Find the method symbol to reuse existing method block created by ApexSymbolCollectorListener
    const methodId = ctx.id();
    const methodName = methodId?.text;
    if (methodName) {
      try {
        const allSymbols = this.symbolTable.getAllSymbols();
        const fileUri = this.symbolTable.getFileUri();

        // Find method symbol first
        const currentType = this.getCurrentType(ctx);
        let methodSymbol: MethodSymbol | undefined;

        if (currentType) {
          const typeBlock = allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              s.parentId === currentType.id,
          ) as ScopeSymbol | undefined;

          if (typeBlock) {
            // Method symbols have parentId pointing to class block (set by ApexSymbolCollectorListener)
            methodSymbol = allSymbols.find(
              (s) =>
                s.name === methodName &&
                (s.kind === SymbolKind.Method ||
                  s.kind === SymbolKind.Constructor) &&
                s.fileUri === fileUri &&
                s.parentId === typeBlock.id,
            ) as MethodSymbol | undefined;
          }

          // Fallback: check if parentId points to class symbol
          if (!methodSymbol) {
            methodSymbol = allSymbols.find(
              (s) =>
                s.name === methodName &&
                (s.kind === SymbolKind.Method ||
                  s.kind === SymbolKind.Constructor) &&
                s.fileUri === fileUri &&
                s.parentId === currentType.id,
            ) as MethodSymbol | undefined;
          }
        }

        if (!methodSymbol) {
          methodSymbol = allSymbols.find(
            (s) =>
              s.name === methodName &&
              (s.kind === SymbolKind.Method ||
                s.kind === SymbolKind.Constructor) &&
              s.fileUri === fileUri,
          ) as MethodSymbol | undefined;
        }

        // Find existing method block by location (StructureListener creates it)
        const location = this.getLocation(ctx);
        const existingMethodBlock = allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'method' &&
            s.fileUri === fileUri &&
            s.location?.symbolRange &&
            s.location.symbolRange.startLine ===
              location.symbolRange.startLine &&
            s.location.symbolRange.startColumn ===
              location.symbolRange.startColumn,
        ) as ScopeSymbol | undefined;

        if (existingMethodBlock) {
          // Update parentId to semantic hierarchy (StructureListener uses stack-based)
          if (methodSymbol) {
            existingMethodBlock.parentId = methodSymbol.id;
          }
          this.scopeStack.push(existingMethodBlock);
          return;
        }

        // Fallback: create block if no existing block found (StructureListener should have run)
        const name = this.generateBlockName('method');
        const parentScope: ScopeSymbol | null = this.getCurrentScopeSymbol(ctx);

        const blockSymbol = this.createBlockSymbol(
          name,
          'method',
          location,
          parentScope,
          methodSymbol ? methodSymbol.name : methodName,
          ctx,
        );

        if (blockSymbol && methodSymbol) {
          blockSymbol.parentId = methodSymbol.id;
        }

        if (blockSymbol) {
          this.scopeStack.push(blockSymbol);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        this.logger.warn(() => `Error in method declaration: ${errorMessage}`);
      }
    }
  }

  exitMethodDeclaration(): void {
    this.exitScope('method');
  }

  enterIfStatement(ctx: IfStatementContext): void {
    this.enterScope('if', ctx);
  }

  exitIfStatement(): void {
    this.exitScope('if');
  }

  enterWhileStatement(ctx: WhileStatementContext): void {
    this.enterScope('while', ctx);
  }

  exitWhileStatement(): void {
    this.exitScope('while');
  }

  enterForStatement(ctx: ForStatementContext): void {
    this.enterScope('for', ctx);
  }

  exitForStatement(): void {
    this.exitScope('for');
  }

  enterDoWhileStatement(ctx: DoWhileStatementContext): void {
    this.enterScope('doWhile', ctx);
  }

  exitDoWhileStatement(): void {
    this.exitScope('doWhile');
  }

  enterRunAsStatement(ctx: RunAsStatementContext): void {
    this.enterScope('runAs', ctx);
  }

  exitRunAsStatement(): void {
    this.exitScope('runAs');
  }

  enterTryStatement(ctx: TryStatementContext): void {
    this.enterScope('try', ctx);
  }

  exitTryStatement(): void {
    this.exitScope('try');
  }

  enterCatchClause(ctx: CatchClauseContext): void {
    this.enterScope('catch', ctx);
  }

  exitCatchClause(): void {
    this.exitScope('catch');
  }

  enterFinallyBlock(ctx: FinallyBlockContext): void {
    this.enterScope('finally', ctx);
  }

  exitFinallyBlock(): void {
    this.exitScope('finally');
  }

  enterSwitchStatement(ctx: SwitchStatementContext): void {
    this.enterScope('switch', ctx);
  }

  exitSwitchStatement(): void {
    this.exitScope('switch');
  }

  enterWhenControl(ctx: WhenControlContext): void {
    this.enterScope('when', ctx);
  }

  exitWhenControl(): void {
    this.exitScope('when');
  }

  enterGetter(ctx: GetterContext): void {
    this.enterScope('getter', ctx);
  }

  exitGetter(): void {
    this.exitScope('getter');
  }

  enterSetter(ctx: SetterContext): void {
    this.enterScope('setter', ctx);
  }

  exitSetter(): void {
    this.exitScope('setter');
  }

  // Helper methods for symbol creation and scope tracking

  private getCurrentScopeSymbol(ctx?: ParserRuleContext): ScopeSymbol | null {
    // First try scope stack (fast path when stack has entries)
    const peeked = this.scopeStack.peek();
    if (peeked && isBlockSymbol(peeked)) {
      return peeked;
    }

    // Fallback: Use parse tree traversal when scope stack is empty
    if (ctx && this.scopeStack.isEmpty()) {
      const fileUri = this.symbolTable.getFileUri();
      const allSymbols = this.symbolTable.getAllSymbols();

      // First, try to find method block by traversing parse tree
      // Traverse up to find method/constructor declaration
      let current: ParserRuleContext | undefined = ctx.parent;
      let foundMethodDeclaration = false;

      while (current) {
        const contextName = current.constructor.name;

        // Check for method/constructor declaration
        if (
          contextName === 'MethodDeclarationContext' ||
          contextName === 'ConstructorDeclarationContext'
        ) {
          foundMethodDeclaration = true;
          const methodName = this.extractMethodName(current);
          if (methodName) {
            // Find method symbol first - need to check both class block and class symbol as parentId
            const currentType = this.getCurrentType(current);
            let methodSymbol: MethodSymbol | undefined;

            if (currentType) {
              // Find the class block
              const typeBlock = allSymbols.find(
                (s) =>
                  isBlockSymbol(s) &&
                  s.scopeType === 'class' &&
                  s.parentId === currentType.id &&
                  s.fileUri === fileUri,
              ) as ScopeSymbol | undefined;

              if (typeBlock) {
                // Method symbols have parentId pointing to class block
                methodSymbol = allSymbols.find(
                  (s) =>
                    (s.kind === SymbolKind.Method ||
                      s.kind === SymbolKind.Constructor) &&
                    s.name === methodName &&
                    s.fileUri === fileUri &&
                    s.parentId === typeBlock.id,
                ) as MethodSymbol | undefined;
              }

              // Fallback: check if parentId points to class symbol
              if (!methodSymbol) {
                methodSymbol = allSymbols.find(
                  (s) =>
                    (s.kind === SymbolKind.Method ||
                      s.kind === SymbolKind.Constructor) &&
                    s.name === methodName &&
                    s.fileUri === fileUri &&
                    s.parentId === currentType.id,
                ) as MethodSymbol | undefined;
              }
            }

            // Final fallback: find by name and fileUri only
            if (!methodSymbol) {
              methodSymbol = allSymbols.find(
                (s) =>
                  (s.kind === SymbolKind.Method ||
                    s.kind === SymbolKind.Constructor) &&
                  s.name === methodName &&
                  s.fileUri === fileUri,
              ) as MethodSymbol | undefined;
            }

            if (methodSymbol) {
              // Find method block that is a child of the method symbol
              const methodBlock = allSymbols.find(
                (s) =>
                  isBlockSymbol(s) &&
                  s.scopeType === 'method' &&
                  s.parentId === methodSymbol!.id &&
                  s.fileUri === fileUri,
              ) as ScopeSymbol | undefined;

              if (methodBlock) {
                return methodBlock;
              }
            }
          }
          // Found method declaration - don't fall back to class block
          break;
        }

        current = current.parent;
      }

      // If no method declaration found, try to find class block
      if (!foundMethodDeclaration) {
        const currentType = this.getCurrentType(ctx);
        if (currentType) {
          const block = allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              s.parentId === currentType.id &&
              s.fileUri === fileUri,
          ) as ScopeSymbol | undefined;

          return block || null;
        }
      }
    }

    return null;
  }

  private getCurrentType(ctx?: ParserRuleContext): TypeSymbol | null {
    // First try scope stack (fast path when stack has entries)
    const stackArray = this.scopeStack.toArray();
    for (let i = stackArray.length - 1; i >= 0; i--) {
      const owner = stackArray[i];
      if (isBlockSymbol(owner) && owner.scopeType === 'class') {
        // Use getSymbolById for O(1) lookup
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

    // Fallback: Use parse tree traversal when scope stack is empty OR when ctx is provided
    if (ctx) {
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
    // Use fileUri from symbol table instead of currentFilePath to ensure consistency
    const fileUri = this.symbolTable.getFileUri();

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
            s.fileUri === fileUri &&
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
              s.fileUri === fileUri &&
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

  private getCurrentMethod(): MethodSymbol | null {
    const stackArray = this.scopeStack.toArray();
    for (const owner of stackArray) {
      if (isBlockSymbol(owner) && owner.scopeType === 'method') {
        const methodSymbol = this.symbolTable
          .getAllSymbols()
          .find(
            (s) =>
              s.id === owner.parentId &&
              (s.kind === SymbolKind.Method ||
                s.kind === SymbolKind.Constructor),
          );
        if (methodSymbol) {
          return methodSymbol as MethodSymbol;
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

  private createVariableSymbol(
    ctx: ParserRuleContext,
    modifiers: SymbolModifiers,
    name: string,
    kind: SymbolKind.Variable,
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
      namespace,
      [],
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
    const scopePath = this.symbolTable.getCurrentScopePath(parentScope);

    const currentType = ctx ? this.getCurrentType(ctx) : this.getCurrentType();
    let parentId: string | null = null;
    if (currentType && scopeType === 'class') {
      parentId = currentType.id;
    } else if (scopeType === 'method' && semanticName) {
      // For method blocks, find the method symbol and use its ID
      // Need to match by name, fileUri, and containing type/scope
      const allSymbols = this.symbolTable.getAllSymbols();
      let methodSymbol: MethodSymbol | undefined;

      if (currentType) {
        // First try to find method in the current type's scope
        const typeBlock = allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.parentId === currentType.id,
        ) as ScopeSymbol | undefined;

        if (typeBlock) {
          // Find method symbol that is a child of the type block
          // Methods can have parentId pointing to either the type block or the type symbol
          methodSymbol = allSymbols.find(
            (s) =>
              s.name === semanticName &&
              (s.kind === SymbolKind.Method ||
                s.kind === SymbolKind.Constructor) &&
              s.fileUri === fileUri &&
              (s.parentId === typeBlock.id || s.parentId === currentType.id),
          ) as MethodSymbol | undefined;
        }
      }

      // Fallback: find by name and fileUri if type-based lookup failed
      if (!methodSymbol) {
        methodSymbol = allSymbols.find(
          (s) =>
            s.name === semanticName &&
            (s.kind === SymbolKind.Method ||
              s.kind === SymbolKind.Constructor) &&
            s.fileUri === fileUri,
        ) as MethodSymbol | undefined;
      }

      if (methodSymbol) {
        parentId = methodSymbol.id;
      } else if (parentScope) {
        parentId = parentScope.id;
      }
    } else if (parentScope) {
      parentId = parentScope.id;
    }

    // Check if block symbol already exists (from StructureListener)
    // Match by location: fileUri, scopeType, startLine, startColumn
    const existingBlock = this.symbolTable
      .getAllSymbols()
      .find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === scopeType &&
          s.fileUri === fileUri &&
          s.location?.symbolRange &&
          s.location.symbolRange.startLine === location.symbolRange.startLine &&
          s.location.symbolRange.startColumn ===
            location.symbolRange.startColumn,
      ) as ScopeSymbol | undefined;

    if (existingBlock) {
      // Update parentId to semantic hierarchy (StructureListener uses stack-based)
      if (parentId !== null && parentId !== undefined) {
        existingBlock.parentId = parentId;
      }
      return existingBlock;
    }

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

    this.symbolTable.addSymbol(blockSymbol, parentScope ?? null);

    return blockSymbol;
  }

  private generateBlockName(scopeType: ScopeType): string {
    this.blockCounter++;
    return `${scopeType}_${this.blockCounter}`;
  }

  private createTypeInfoFromTypeRef(typeRef: TypeRefContext): TypeInfo {
    return createTypeInfoFromTypeRefUtil(typeRef);
  }

  /**
   * Determine type name from parse tree context
   */
  private determineTypeName(ctx: ParserRuleContext): string | undefined {
    let current: ParserRuleContext | undefined = ctx.parent;

    while (current) {
      const name = current.constructor.name;

      if (
        name === 'ClassDeclarationContext' ||
        name === 'InterfaceDeclarationContext'
      ) {
        const typeId = (current as any).id?.();
        return typeId?.text;
      }

      current = current.parent;
    }

    return undefined;
  }
}
