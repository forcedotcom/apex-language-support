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
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Stack } from 'data-structure-typed';

import { BaseApexParserListener } from './BaseApexParserListener';
import {
  SymbolReferenceFactory,
  ReferenceContext,
  EnhancedSymbolReference,
} from '../../types/symbolReference';
import type { SymbolReference } from '../../types/symbolReference';
import { SymbolTable, SymbolLocation } from '../../types/symbol';
import { isDotExpressionContext } from '../../utils/contextTypeGuards';
import { HierarchicalReferenceResolver } from '../../types/hierarchicalReference';

interface ChainScope {
  isActive: boolean;
  baseExpression: string;
  chainNodes: SymbolReference[];
  startLocation: SymbolLocation;
  depth: number;
  parentScope?: ChainScope;
}

/**
 * Listener that captures symbol references during parse tree walk.
 * Can be used independently or alongside symbol declaration listeners.
 * Works with any SymbolTable, regardless of how symbols were collected.
 */
export class ApexReferenceCollectorListener extends BaseApexParserListener<SymbolTable> {
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

  // WeakMap to store TYPE_DECLARATION SymbolReference objects by localVariableDeclaration context
  private localVarDeclToTypeRefMap = new WeakMap<
    ParserRuleContext,
    SymbolReference
  >();

  constructor(symbolTable?: SymbolTable) {
    super();
    this.symbolTable = symbolTable || new SymbolTable();
  }

  setCurrentFileUri(fileUri: string): void {
    this.currentFilePath = fileUri;
    this.symbolTable.setFileUri(fileUri);
    this.logger.debug(() => `Set current file path to: ${fileUri}`);
  }

  getResult(): SymbolTable {
    return this.symbolTable;
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
   * Capture field access references (e.g., "property.Id")
   */
  enterDotExpression(ctx: DotExpressionContext): void {
    if (this.shouldSuppress(ctx)) {
      return;
    }

    if (!this.chainExpressionScope) {
      this.chainExpressionScope = this.createNewChainScope(ctx);
    } else {
      this.chainExpressionScope.depth++;
    }
  }

  /**
   * Exit dot expression to finalize chain processing
   */
  exitDotExpression(ctx: DotExpressionContext): void {
    if (this.chainExpressionScope) {
      if (this.chainExpressionScope.depth === 0) {
        this.finalizeChainScope(this.chainExpressionScope);
        this.chainExpressionScope = null;
      } else {
        this.chainExpressionScope.depth--;
      }
    }
  }

  /**
   * Capture unqualified method calls using dedicated MethodCallContext
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
        ? this.getLocation(anyIdNode as unknown as ParserRuleContext)
        : this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName();

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
   * Capture type references in variable declarations
   */
  enterTypeRef(ctx: TypeRefContext): void {
    try {
      const typeNames = ctx.typeName();
      if (!typeNames || typeNames.length === 0) return;

      const typeName = typeNames[0];
      if (!typeName) return;

      const isTypeDeclaration = this.isTypeDeclarationContext(ctx);
      const isMethodReturnType = this.isMethodReturnTypeContext(ctx);

      let fullTypeName: string;
      let baseLocation: SymbolLocation | undefined;

      if (typeNames.length > 1) {
        const typeNameParts = typeNames.map((tn) => {
          const id = tn.id();
          if (id) {
            return id.text;
          } else {
            return `${tn.LIST() || tn.SET() || tn.MAP()}`;
          }
        });
        fullTypeName = typeNameParts.join('.');
        baseLocation = this.getLocationForReference(typeNames[0]);
      } else {
        const baseTypeId = typeName.id();
        if (baseTypeId) {
          fullTypeName = baseTypeId.text;
          baseLocation = this.getLocationForReference(baseTypeId);
        } else {
          const listToken = typeName.LIST?.();
          const setToken = typeName.SET?.();
          const mapToken = typeName.MAP?.();
          const token = listToken || setToken || mapToken;

          if (token) {
            fullTypeName =
              token.text || `${listToken ? 'List' : setToken ? 'Set' : 'Map'}`;
            const identifierRange = this.getIdentifierRange(typeName);
            if (identifierRange) {
              baseLocation = {
                symbolRange: identifierRange,
                identifierRange: identifierRange,
              };
            } else {
              baseLocation = this.getLocationForReference(typeName);
            }
          } else {
            fullTypeName = 'Object';
            baseLocation = this.getLocationForReference(typeName);
          }
        }
      }

      if (!baseLocation) {
        baseLocation = this.getLocation(ctx);
      }

      const parentContext = this.determineTypeReferenceContext(ctx);

      let baseReference: SymbolReference;
      if (isMethodReturnType) {
        baseReference = SymbolReferenceFactory.createReturnTypeReference(
          fullTypeName,
          baseLocation,
          parentContext,
        );
      } else if (isTypeDeclaration) {
        baseReference = SymbolReferenceFactory.createTypeDeclarationReference(
          fullTypeName,
          baseLocation,
          parentContext,
        );

        const parent = ctx.parent;
        if (
          parent &&
          parent.constructor.name === 'LocalVariableDeclarationContext'
        ) {
          this.localVarDeclToTypeRefMap.set(parent, baseReference);
        }
      } else {
        baseReference = SymbolReferenceFactory.createParameterTypeReference(
          fullTypeName,
          baseLocation,
          parentContext,
        );
      }

      this.symbolTable.addTypeReference(baseReference);
    } catch (error) {
      this.logger.warn(
        () => `Error capturing type declaration reference: ${error}`,
      );
    }
  }

  /**
   * Capture field access references directly from the parser structure
   */
  enterAnyId(ctx: AnyIdContext): void {
    try {
      if (this.shouldSuppress(ctx)) {
        return;
      }

      const fieldName = ctx.text || 'unknownField';
      const location = this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName();

      if (this.chainExpressionScope?.isActive) {
        this.chainExpressionScope.chainNodes.push(
          this.createExpressionNode(
            fieldName,
            location,
            ReferenceContext.FIELD_ACCESS,
          ),
        );
      } else {
        const dotParent = ctx.parent;
        if (dotParent && isDotExpressionContext(dotParent)) {
          const expressions = (dotParent as any).expression?.();
          const leftExpression =
            Array.isArray(expressions) && expressions.length > 0
              ? expressions[0]
              : (expressions ?? null);

          if (leftExpression) {
            const objectIdentifiers =
              this.extractIdentifiersFromExpression(leftExpression);
            if (objectIdentifiers.length > 0) {
              const objectName = objectIdentifiers[0];
              const fieldRef =
                SymbolReferenceFactory.createFieldAccessReference(
                  fieldName,
                  location,
                  objectName,
                  parentContext,
                );
              this.symbolTable.addTypeReference(fieldRef);
              this.addToCurrentMethodParameters(fieldRef);
            }
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
   */
  enterIdPrimary(ctx: IdPrimaryContext): void {
    if (this.shouldSuppress(ctx)) {
      return;
    }

    const variableName = this.getTextFromContext(ctx);

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
    this.addToCurrentMethodParameters(reference);
  }

  /**
   * Capture primary expression references
   */
  enterPrimaryExpression(ctx: PrimaryExpressionContext): void {
    // The specific primary types are handled by their individual listeners
  }

  /**
   * Capture 'this' keyword references
   */
  enterThisPrimary(ctx: ThisPrimaryContext): void {
    try {
      const location = this.getLocation(ctx);
      const thisReference = SymbolReferenceFactory.createVariableUsageReference(
        'this',
        location,
        this.getCurrentMethodName(),
      );
      this.symbolTable.addTypeReference(thisReference);
    } catch (error) {
      this.logger.warn(() => `Error capturing this reference: ${error}`);
    }
  }

  /**
   * Capture 'super' keyword references
   */
  enterSuperPrimary(ctx: SuperPrimaryContext): void {
    try {
      const location = this.getLocation(ctx);
      const superReference =
        SymbolReferenceFactory.createVariableUsageReference(
          'super',
          location,
          this.getCurrentMethodName(),
        );
      this.symbolTable.addTypeReference(superReference);
    } catch (error) {
      this.logger.warn(() => `Error capturing super reference: ${error}`);
    }
  }

  /**
   * Capture assignment expression references
   */
  enterAssignExpression(ctx: AssignExpressionContext): void {
    try {
      this.suppressAssignmentLHS = true;
      const expressions = (ctx as any).expression?.();
      const leftExpression =
        Array.isArray(expressions) && expressions.length > 0
          ? expressions[0]
          : (expressions ?? null);

      if (leftExpression) {
        this.suppressedLHSRange = this.getLocation(
          leftExpression as unknown as ParserRuleContext,
        );
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

      if (arrayExpression) {
        const identifiers =
          this.extractIdentifiersFromExpression(arrayExpression);
        for (const identifier of identifiers) {
          const location = this.getLocation(ctx);
          const reference = SymbolReferenceFactory.createVariableUsageReference(
            identifier,
            location,
            this.getCurrentMethodName(),
          );
          this.symbolTable.addTypeReference(reference);
        }
      }

      const indexExpressions = (ctx as any).expressionList?.()?.expression?.();
      if (indexExpressions) {
        const indexArray = Array.isArray(indexExpressions)
          ? indexExpressions
          : [indexExpressions];
        for (const indexExpr of indexArray) {
          const indexIdentifiers =
            this.extractIdentifiersFromExpression(indexExpr);
          for (const identifier of indexIdentifiers) {
            const location = this.getLocation(ctx);
            const reference =
              SymbolReferenceFactory.createVariableUsageReference(
                identifier,
                location,
                this.getCurrentMethodName(),
              );
            this.symbolTable.addTypeReference(reference);
          }
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
      const typeRef = (ctx as any).typeRef?.();
      if (typeRef) {
        const typeName = this.extractTypeNameFromTypeRef(typeRef);
        const location = this.getLocation(ctx);
        const reference = SymbolReferenceFactory.createCastTypeReference(
          typeName,
          location,
          this.getCurrentMethodName(),
        );
        this.symbolTable.addTypeReference(reference);
      }

      const expression = (ctx as any).expression?.();
      if (expression) {
        const identifiers = this.extractIdentifiersFromExpression(expression);
        for (const identifier of identifiers) {
          const location = this.getLocation(ctx);
          const reference = SymbolReferenceFactory.createVariableUsageReference(
            identifier,
            location,
            this.getCurrentMethodName(),
          );
          this.symbolTable.addTypeReference(reference);
        }
      }

      const catchClause = (ctx as any).catchClause?.();
      if (catchClause) {
        const exceptionType = (catchClause as any).qualifiedName?.()?.id?.();
        if (exceptionType) {
          const exceptionName = Array.isArray(exceptionType)
            ? exceptionType.map((id: any) => id.text).join('.')
            : exceptionType.text;
          const location = this.getLocation(ctx);
          const classRef = SymbolReferenceFactory.createClassReference(
            exceptionName,
            location,
            this.getCurrentMethodName(),
          );
          this.symbolTable.addTypeReference(classRef);
        }
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing cast expression: ${error}`);
    }
  }

  /**
   * Capture type arguments in generic types
   */
  enterTypeArguments(ctx: TypeArgumentsContext): void {
    try {
      const typeList = ctx.typeList();
      if (!typeList) return;

      const typeRefs = typeList.typeRef();
      if (!typeRefs || typeRefs.length === 0) return;

      for (const typeRef of typeRefs) {
        const typeNames = typeRef.typeName();
        if (!typeNames || typeNames.length === 0) continue;

        const typeName = typeNames[0];
        if (!typeName) continue;

        const parentContext = this.determineTypeReferenceContext(typeRef);
        const location = this.getLocationForReference(typeName);

        const genericReference =
          SymbolReferenceFactory.createGenericParameterTypeReference(
            typeName.id()?.text || 'Object',
            location,
            parentContext,
          );
        this.symbolTable.addTypeReference(genericReference);
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing type arguments: ${error}`);
    }
  }

  /**
   * Called when entering an expression list (method parameters, constructor arguments, etc.)
   */
  enterExpressionList(ctx: ExpressionListContext): void {
    if (
      this.isInMethodOrConstructorCall(ctx) &&
      this.chainExpressionScope?.isActive
    ) {
      this.finalizeChainScope(this.chainExpressionScope);
      this.chainExpressionScope = null;
    }
  }

  exitExpressionList(ctx: ExpressionListContext): void {
    // Parameter references are already associated with method calls via the stack
  }

  /**
   * Exit compilation unit - validate cleanup
   */
  exitCompilationUnit(): void {
    this.validateMethodCallStackCleanup();
  }

  exitAnonymousUnit(): void {
    this.validateMethodCallStackCleanup();
  }

  exitBlock(): void {
    // Cleanup if needed
  }

  // Helper methods (extracted from ApexSymbolCollectorListener)

  private captureConstructorCallReference(ctx: NewExpressionContext): void {
    const typeRef = (ctx as any).typeRef?.();
    if (!typeRef) return;

    const typeNames = typeRef.typeName();
    if (!typeNames || typeNames.length === 0) return;

    const typeName = typeNames[0];
    const className = typeName.id()?.text || 'unknownClass';
    const location = this.getLocation(ctx);
    const parentContext = this.getCurrentMethodName();

    const reference = SymbolReferenceFactory.createConstructorCallReference(
      className,
      location,
      parentContext,
    );

    this.methodCallStack.push({
      callRef: reference,
      parameterRefs: [],
    });

    this.symbolTable.addTypeReference(reference);
  }

  private createNewChainScope(ctx: DotExpressionContext): ChainScope {
    return {
      isActive: true,
      baseExpression: this.extractBaseExpressionFromParser(ctx),
      chainNodes: [],
      startLocation: this.getLocation(ctx),
      depth: 0,
    };
  }

  private finalizeChainScope(chainScope: ChainScope): void {
    if (!chainScope.isActive) return;
    chainScope.isActive = false;

    if (chainScope.chainNodes.length === 0) {
      return;
    }

    this.createChainRootReference(chainScope);
  }

  private createChainRootReference(chainScope: ChainScope): void {
    try {
      const { baseExpression, chainNodes, startLocation } = chainScope;

      if (baseExpression === 'this') {
        const parentContext = this.getCurrentMethodName();
        chainNodes.forEach((chainNode) => {
          const memberRef = new EnhancedSymbolReference(
            chainNode.name,
            chainNode.location,
            chainNode.context === ReferenceContext.CHAIN_STEP
              ? ReferenceContext.FIELD_ACCESS
              : chainNode.context,
            undefined,
            parentContext,
          );
          this.symbolTable.addTypeReference(memberRef);
        });
        return;
      }

      const baseExpressionLocation = this.createPreciseBaseLocation(
        baseExpression,
        startLocation,
      );

      const initialChainNodes = [
        this.createExpressionNode(
          baseExpression,
          baseExpressionLocation,
          ReferenceContext.CHAIN_STEP,
        ),
        ...chainNodes,
      ];

      const analyzedChainNodes = this.analyzeChainWithRightToLeftNarrowing(
        initialChainNodes,
        baseExpression,
        startLocation,
      );

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

      // Create a root reference for the chain
      const rootRef = SymbolReferenceFactory.createChainedExpressionReference(
        analyzedChainNodes,
        {
          name: fullExpression,
          location: chainedExpression,
          context: ReferenceContext.CHAINED_TYPE,
          parentContext: this.getCurrentMethodName(),
        },
        this.getCurrentMethodName(),
      );

      this.symbolTable.addTypeReference(rootRef);
    } catch (error) {
      this.logger.warn(() => `Error creating chain root reference: ${error}`);
    }
  }

  private processStandaloneMethodCall(
    ctx: DotMethodCallContext,
    methodName: string,
    methodLocation: SymbolLocation,
  ): void {
    try {
      const parentContext = this.getCurrentMethodName();
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

  private getCurrentMethodName(): string | undefined {
    const stackEntry = this.methodCallStack.peek();
    return stackEntry?.callRef.parentContext;
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

  private isInMethodOrConstructorCall(ctx: ExpressionListContext): boolean {
    let current: ParserRuleContext | undefined = ctx.parent;
    while (current) {
      if (
        current.constructor.name === 'MethodCallContext' ||
        current.constructor.name === 'DotMethodCallContext' ||
        current.constructor.name === 'NewExpressionContext'
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private isGenericArgument(ctx: TypeRefContext): boolean {
    let current: ParserRuleContext | undefined = ctx.parent;
    while (current) {
      if (current.constructor.name === 'TypeArgumentsContext') {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private isTypeDeclarationContext(ctx: TypeRefContext): boolean {
    let current: ParserRuleContext | undefined = ctx.parent;
    while (current) {
      const name = current.constructor.name;
      if (
        name === 'LocalVariableDeclarationContext' ||
        name === 'FieldDeclarationContext' ||
        name === 'PropertyDeclarationContext'
      ) {
        return true;
      }
      if (
        name === 'MethodDeclarationContext' ||
        name === 'ConstructorDeclarationContext' ||
        name === 'InterfaceMethodDeclarationContext'
      ) {
        return false;
      }
      current = current.parent;
    }
    return false;
  }

  private isMethodReturnTypeContext(ctx: TypeRefContext): boolean {
    let current: ParserRuleContext | undefined = ctx.parent;
    while (current) {
      const name = current.constructor.name;
      if (
        name === 'MethodDeclarationContext' ||
        name === 'ConstructorDeclarationContext' ||
        name === 'InterfaceMethodDeclarationContext'
      ) {
        return true;
      }
      if (
        name === 'LocalVariableDeclarationContext' ||
        name === 'FieldDeclarationContext' ||
        name === 'PropertyDeclarationContext'
      ) {
        return false;
      }
      current = current.parent;
    }
    return false;
  }

  private determineTypeReferenceContext(
    ctx: TypeRefContext | ParserRuleContext,
  ): string | undefined {
    return this.getCurrentMethodName();
  }

  private extractBaseExpressionFromParser(ctx: DotExpressionContext): string {
    const expressions = (ctx as any).expression?.();
    const leftExpression =
      Array.isArray(expressions) && expressions.length > 0
        ? expressions[0]
        : (expressions ?? null);

    if (leftExpression) {
      const identifiers = this.extractIdentifiersFromExpression(leftExpression);
      return identifiers.length > 0 ? identifiers[0] : 'unknown';
    }

    return 'unknown';
  }

  private extractIdentifiersFromExpression(expr: any): string[] {
    const identifiers: string[] = [];

    if (expr.id) {
      const id = expr.id();
      if (id) {
        identifiers.push(id.text);
      }
    } else if (expr.text) {
      identifiers.push(expr.text);
    } else if (expr.children) {
      for (const child of expr.children) {
        if (child.id) {
          const id = child.id();
          if (id) {
            identifiers.push(id.text);
          }
        } else if (child.text) {
          identifiers.push(child.text);
        }
      }
    }

    return identifiers;
  }

  private extractQualifierFromExpression(expr: any): string {
    const identifiers = this.extractIdentifiersFromExpression(expr);
    return identifiers.length > 0 ? identifiers[0] : 'unknown';
  }

  private extractTypeNameFromTypeRef(typeRef: any): string {
    const typeNames = typeRef.typeName?.();
    if (!typeNames || typeNames.length === 0) {
      return 'Object';
    }

    const typeName = Array.isArray(typeNames) ? typeNames[0] : typeNames;
    const id = typeName.id?.();
    if (id) {
      return Array.isArray(id) ? id[0].text : id.text;
    }

    return 'Object';
  }

  private createExpressionNode(
    name: string,
    location: SymbolLocation,
    context: ReferenceContext,
  ): SymbolReference {
    return new EnhancedSymbolReference(
      name,
      location,
      context,
      undefined,
      this.getCurrentMethodName(),
    );
  }

  private createChainedExpression(
    expression: string,
    startLocation: SymbolLocation,
    endLocation: SymbolLocation,
  ): SymbolLocation {
    return {
      symbolRange: {
        startLine: startLocation.symbolRange.startLine,
        startColumn: startLocation.symbolRange.startColumn,
        endLine: endLocation.symbolRange.endLine,
        endColumn: endLocation.symbolRange.endColumn,
      },
      identifierRange: {
        startLine: startLocation.identifierRange.startLine,
        startColumn: startLocation.identifierRange.startColumn,
        endLine: endLocation.identifierRange.endLine,
        endColumn: endLocation.identifierRange.endColumn,
      },
    };
  }

  private createPreciseBaseLocation(
    baseExpression: string,
    startLocation: SymbolLocation,
  ): SymbolLocation {
    return {
      symbolRange: startLocation.symbolRange,
      identifierRange: {
        startLine: startLocation.identifierRange.startLine,
        startColumn: startLocation.identifierRange.startColumn,
        endLine: startLocation.identifierRange.startLine,
        endColumn:
          startLocation.identifierRange.startColumn + baseExpression.length,
      },
    };
  }

  private analyzeChainWithRightToLeftNarrowing(
    chainNodes: SymbolReference[],
    baseExpression: string,
    startLocation: SymbolLocation,
  ): SymbolReference[] {
    const analyzedNodes: SymbolReference[] = [];

    for (let i = chainNodes.length - 1; i >= 0; i--) {
      const currentNode = chainNodes[i];
      const nextNode = i < chainNodes.length - 1 ? analyzedNodes[0] : null;

      const narrowedContext = this.narrowContextBasedOnNextNode(
        currentNode,
        nextNode,
        i === 0,
      );

      const narrowedNode: SymbolReference = {
        ...currentNode,
        context: narrowedContext,
      };

      analyzedNodes.unshift(narrowedNode);
    }

    return analyzedNodes;
  }

  private narrowContextBasedOnNextNode(
    currentNode: SymbolReference,
    nextNode: SymbolReference | null,
    isBaseNode: boolean,
  ): ReferenceContext {
    if (nextNode === null) {
      return currentNode.context;
    }

    if (currentNode.context === ReferenceContext.METHOD_CALL) {
      return ReferenceContext.METHOD_CALL;
    }

    switch (nextNode.context) {
      case ReferenceContext.METHOD_CALL:
      case ReferenceContext.FIELD_ACCESS:
      case ReferenceContext.CHAIN_STEP:
      default:
        return ReferenceContext.CHAIN_STEP;
    }
  }

  private getLocation(ctx: ParserRuleContext): SymbolLocation {
    return {
      symbolRange: {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop?.line ?? ctx.start.line,
        endColumn:
          (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
          (ctx.stop?.text?.length ?? 0),
      },
      identifierRange: {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop?.line ?? ctx.start.line,
        endColumn:
          (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
          (ctx.stop?.text?.length ?? 0),
      },
    };
  }

  private getLocationForReference(ctx: any): SymbolLocation {
    if (ctx.start && ctx.stop) {
      return this.getLocation(ctx as ParserRuleContext);
    }
    return this.getLocation(ctx as ParserRuleContext);
  }

  private getIdentifierRange(ctx: any): {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null {
    if (ctx.start && ctx.stop) {
      return {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop.line,
        endColumn: ctx.stop.charPositionInLine + (ctx.stop.text?.length ?? 0),
      };
    }
    return null;
  }

  private getTextFromContext(ctx: ParserRuleContext): string {
    return ctx.text || '';
  }

  private validateMethodCallStackCleanup(): void {
    if (!this.methodCallStack.isEmpty()) {
      const entries = this.methodCallStack.toArray();
      const remainingEntries = entries.length;
      this.logger.warn(
        () =>
          `methodCallStack is not empty after parsing: ${remainingEntries} entries remaining. ` +
          'This may indicate incomplete cleanup from error conditions.',
      );
      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        this.logger.warn(
          () =>
            `  Entry ${index + 1}: ${entry.callRef.context} "${entry.callRef.name}" ` +
            `at line ${entry.callRef.location.symbolRange.startLine}`,
        );
      }
      this.methodCallStack.clear();
    }
  }
}
