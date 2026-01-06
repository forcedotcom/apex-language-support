/*
 * Copyright (c) 2025, salesforce.com, inc.
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
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Stack } from 'data-structure-typed';

import { BaseApexParserListener } from './BaseApexParserListener';
import { ApexReferenceCollectorListener } from './ApexReferenceCollectorListener';
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
import { createTypeInfo } from '../../utils/TypeInfoFactory';

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
        this.chainExpressionScope.chainNodes.push(
          this.createExpressionNode(
            methodName,
            methodLocation,
            ReferenceContext.METHOD_CALL,
          ),
        );
      } else {
        this.processStandaloneMethodCall(ctx, methodName, methodLocation);
      }

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
   * Capture any ID references (variable usage, etc.)
   */
  enterAnyId(ctx: AnyIdContext): void {
    try {
      if (this.shouldSuppress(ctx)) {
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
   * Capture enhanced for control type references
   */
  enterEnhancedForControl(ctx: EnhancedForControlContext): void {
    try {
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
      const objectLocation = this.getLocation(
        objectExpr as unknown as ParserRuleContext,
      );

      for (const objectName of objectIdentifiers) {
        const objRef = SymbolReferenceFactory.createVariableUsageReference(
          objectName,
          objectLocation,
          parentContext,
          'read',
        );
        this.symbolTable.addTypeReference(objRef);
      }

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

          const varRef = SymbolReferenceFactory.createVariableUsageReference(
            qualifier,
            qualifierLocation,
            parentContext,
          );
          this.symbolTable.addTypeReference(varRef);
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

        const variableSymbol = this.createVariableSymbol(
          ctx,
          modifiers,
          name,
          SymbolKind.Variable,
          type,
        );

        this.symbolTable.addSymbol(
          variableSymbol,
          this.getCurrentScopeSymbol(),
        );
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
   */
  enterBlock(ctx: BlockContext): void {
    try {
      const location = this.getLocation(ctx);
      const currentScope = this.getCurrentScopeSymbol();

      const blockName = this.generateBlockName('block');
      const blockSymbol = this.createBlockSymbol(
        blockName,
        'block',
        location,
        currentScope,
      );

      if (blockSymbol) {
        this.scopeStack.push(blockSymbol);
      }
    } catch (_e) {
      // Silently continue - block scope tracking
    }
  }

  exitBlock(): void {
    this.scopeStack.pop();
    // No validation needed for generic blocks
  }

  // Helper methods for symbol creation and scope tracking

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
  ): ScopeSymbol | null {
    const fileUri = this.symbolTable.getFileUri();
    const scopePath = this.symbolTable.getCurrentScopePath(parentScope);

    const currentType = this.getCurrentType();
    let parentId: string | null = null;
    if (currentType && scopeType === 'class') {
      parentId = currentType.id;
    } else if (parentScope) {
      parentId = parentScope.id;
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
    const typeText = typeRef.text || '';
    return createTypeInfo(typeText);
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
