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
  TypeListContext,
  EnhancedForControlContext,
  WhenValueContext,
  InstanceOfExpressionContext,
  TypeRefPrimaryContext,
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
import {
  isDotExpressionContext,
  isContextType,
} from '../../utils/contextTypeGuards';
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

  // Caches for expensive context lookups
  private typeDeclarationCache = new WeakMap<ParserRuleContext, boolean>();
  private contextNameCache = new WeakMap<
    ParserRuleContext,
    string | undefined
  >();

  // Context tracking fields set by primary listeners
  private currentMethodName: string | undefined;
  private currentTypeName: string | undefined;

  constructor(symbolTable: SymbolTable) {
    super();
    this.symbolTable = symbolTable;
  }

  setCurrentFileUri(fileUri: string): void {
    this.currentFilePath = fileUri;
    this.symbolTable.setFileUri(fileUri);
    this.logger.debug(() => `Set current file path to: ${fileUri}`);
  }

  /**
   * Set parent context from primary listener
   * @param methodName Method name if reference is in a method
   * @param typeName Type/Class name if reference is at class level
   */
  setParentContext(methodName?: string, typeName?: string): void {
    this.currentMethodName = methodName;
    this.currentTypeName = typeName;
  }

  /**
   * Reset parent context (useful when switching between subtrees)
   */
  resetContext(): void {
    this.currentMethodName = undefined;
    this.currentTypeName = undefined;
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
        ? this.getLocationForReference(idNode)
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
        ? this.getLocationForReference(anyIdNode)
        : this.getLocation(ctx);
      const parentContext = this.getCurrentMethodName();

      this.logger.debug(
        () =>
          `[DOT_METHOD_CALL] Creating reference for "${methodName}" ` +
          `at ${methodLocation.identifierRange.startLine}:${methodLocation.identifierRange.startColumn}-` +
          `${methodLocation.identifierRange.endLine}:${methodLocation.identifierRange.endColumn} ` +
          `(anyIdNode type: ${anyIdNode ? anyIdNode.constructor.name : 'null'})`,
      );

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
      // Check if this TypeRef is inside a TypeArgumentsContext (generic type parameter)
      // If so, enterTypeArguments will handle it, so we can skip it here
      // UNLESS we're in a type declaration context - in that case, we need to process it
      const isGenericArg = this.isGenericArgument(ctx);
      const isTypeDeclaration = this.isTypeDeclarationContext(ctx);

      this.logger.debug(
        () =>
          `[TYPE_REF] enterTypeRef at ${ctx.start?.line}:${ctx.start?.charPositionInLine}, ` +
          `parent=${ctx.parent?.constructor.name}, ` +
          `isGenericArg=${isGenericArg}, isTypeDeclaration=${isTypeDeclaration}`,
      );

      // Special case: if parent is TypeListContext, this is likely a generic parameter
      // Check if we're in a type declaration context
      const parentIsTypeList =
        ctx.parent?.constructor.name === 'TypeListContext';
      let isGenericArgInTypeDecl = false;
      if (parentIsTypeList) {
        // Walk up to see if we're inside a type declaration
        let walkParent: ParserRuleContext | undefined = ctx.parent;
        let depth = 0;
        const parentChain: string[] = [];
        while (walkParent && depth < 10) {
          parentChain.push(walkParent.constructor.name);
          if (
            walkParent.constructor.name === 'LocalVariableDeclarationContext' ||
            walkParent.constructor.name === 'FieldDeclarationContext' ||
            walkParent.constructor.name === 'PropertyDeclarationContext'
          ) {
            isGenericArgInTypeDecl = true;
            this.logger.debug(
              () =>
                `[TYPE_REF] Found type declaration context in parent chain: [${parentChain.join(' -> ')}]`,
            );
            break;
          }
          walkParent = walkParent.parent;
          depth++;
        }
        if (!isGenericArgInTypeDecl) {
          this.logger.debug(
            () =>
              '[TYPE_REF] TypeListContext parent but NOT in type declaration. ' +
              `Parent chain: [${parentChain.join(' -> ')}]`,
          );
        }
      }

      if (isGenericArg && !isGenericArgInTypeDecl) {
        // Generic type parameters are handled by enterTypeArguments
        // But if enterTypeArguments isn't called (e.g., for type declarations),
        // we need to handle it here
        this.logger.debug(
          () =>
            '[TYPE_REF] Skipping generic argument ' +
            '(will be handled by enterTypeArguments) ' +
            `at ${ctx.start?.line}:${ctx.start?.charPositionInLine}`,
        );
        return;
      }

      // If this is a generic argument in a type declaration, we'll process it below
      if (isGenericArg && isGenericArgInTypeDecl) {
        this.logger.debug(
          () =>
            '[TYPE_REF] Processing generic argument in type declaration ' +
            `at ${ctx.start?.line}:${ctx.start?.charPositionInLine}`,
        );
        // Process this as a generic parameter reference
        const typeNames = ctx.typeName();
        if (typeNames && typeNames.length > 0) {
          const typeName = typeNames[0];
          const idNode = typeName.id();
          if (idNode) {
            const location = this.getLocationForReference(idNode);
            const parentContext = this.determineTypeReferenceContext(ctx);
            const genericReference =
              SymbolReferenceFactory.createGenericParameterTypeReference(
                idNode.text,
                location,
                parentContext,
              );
            this.symbolTable.addTypeReference(genericReference);
            this.logger.debug(
              () =>
                `[TYPE_REF] Created generic parameter reference for '${idNode.text}' ` +
                `at ${location.identifierRange.startLine}:${location.identifierRange.startColumn}`,
            );
            return; // Don't process further as a regular type reference
          }
        }
      }

      // Debug: Log parent context structure for type declarations
      // Also check if we're in a type declaration by walking up to find LocalVariableDeclarationContext
      // even if isTypeDeclarationContext returns false (it might stop early at MethodDeclarationContext)
      let isInTypeDeclaration = this.isTypeDeclarationContext(ctx);
      if (!isInTypeDeclaration) {
        // Check if we're inside a TypeListContext that's part of a type declaration
        // This handles cases where enterTypeRef is called for generic parameters
        let checkParent: ParserRuleContext | undefined = ctx.parent;
        let checkDepth = 0;
        while (checkParent && checkDepth < 20) {
          const checkName = checkParent.constructor.name;
          if (
            checkName === 'LocalVariableDeclarationContext' ||
            checkName === 'FieldDeclarationContext' ||
            checkName === 'PropertyDeclarationContext'
          ) {
            isInTypeDeclaration = true;
            this.logger.debug(
              () =>
                `[TYPE_REF] Found type declaration context by walking up: ${checkName} at depth ${checkDepth}`,
            );
            break;
          }
          if (
            checkName === 'MethodDeclarationContext' ||
            checkName === 'ConstructorDeclarationContext'
          ) {
            // Stop if we hit a method - we're not in a type declaration
            break;
          }
          checkParent = checkParent.parent;
          checkDepth++;
        }
      }

      const isTypeDeclarationForLog = isInTypeDeclaration;
      this.logger.debug(
        () =>
          `[TYPE_REF] enterTypeRef at ${ctx.start?.line}:${ctx.start?.charPositionInLine}, ` +
          `parent=${ctx.parent?.constructor.name}, ` +
          `isTypeDeclaration=${isTypeDeclarationForLog}`,
      );
      if (isTypeDeclarationForLog) {
        const parent = ctx.parent;
        this.logger.debug(
          () =>
            `[TYPE_REF] Type declaration at ${ctx.start?.line}:${ctx.start?.charPositionInLine}, ` +
            `parent=${parent?.constructor.name}`,
        );
        if (parent) {
          // Check if parent has typeArguments
          const parentTypeRef = (parent as any).typeRef?.();
          if (parentTypeRef) {
            this.logger.debug(
              () =>
                '[TYPE_REF] Parent has typeRef, checking for typeArguments: ' +
                `${!!(parentTypeRef as any).typeArguments?.()}`,
            );
          }
          // Walk up the tree to find typeArguments
          let walkParent: ParserRuleContext | undefined = parent;
          let depth = 0;
          while (walkParent && depth < 5) {
            const typeArgs = (walkParent as any).typeArguments?.();
            if (typeArgs) {
              const parentName = walkParent.constructor.name;
              this.logger.debug(
                () =>
                  `[TYPE_REF] Found typeArguments on parent at depth ${depth}: ${parentName}`,
              );
              break;
            }
            walkParent = walkParent.parent;
            depth++;
          }
        }
      }

      const typeNames = ctx.typeName();
      if (!typeNames || typeNames.length === 0) return;

      const typeName = typeNames[0];
      if (!typeName) return;

      // Check if this TypeRef has typeArguments directly (for generic types like List<String>)
      // The typeArguments might be on the first typeName, not on the TypeRefContext itself
      // Try accessing typeArguments on the first typeName (which might be a baseTypeName)
      const baseTypeName = typeName;
      const typeArgsOnBase = (baseTypeName as any).typeArguments?.();

      // Debug: Log structure for type declarations and List/Set/Map types
      const isListSetMap = !!(
        typeName.LIST?.() ||
        typeName.SET?.() ||
        typeName.MAP?.()
      );
      if (isTypeDeclaration || isListSetMap) {
        // Check children of both ctx and typeName to see the actual parse tree structure
        const ctxChildren = (ctx as any).children || [];
        const ctxChildTypes = ctxChildren
          .map((c: any) => c.constructor.name)
          .join(', ');
        const typeNameChildren = (typeName as any).children || [];
        const typeNameChildTypes = typeNameChildren
          .map((c: any) => c.constructor.name)
          .join(', ');

        this.logger.debug(
          () =>
            `[TYPE_REF] Type structure at ${ctx.start?.line}:${ctx.start?.charPositionInLine}: ` +
            `isTypeDeclaration=${isTypeDeclaration}, isListSetMap=${isListSetMap}, ` +
            `ctx.typeArguments=${!!(ctx as any).typeArguments?.()}, ` +
            `typeName.typeArguments=${!!(typeName as any).typeArguments?.()}, ` +
            `typeName.LIST=${!!typeName.LIST?.()}, ` +
            `typeName.id=${typeName.id()?.text || 'none'}, ` +
            `ctx.children=[${ctxChildTypes}], ` +
            `typeName.children=[${typeNameChildTypes}]`,
        );

        // Try to manually access typeArguments through various paths
        const ctxTypeArgs = (ctx as any).typeArguments?.();
        const typeNameTypeArgs = (typeName as any).typeArguments?.();

        // Check if typeArguments is in ctx children (might be a sibling of typeName)
        let typeArgsInCtxChildren: any = null;
        for (const child of ctxChildren) {
          if (child.constructor.name === 'TypeArgumentsContext') {
            typeArgsInCtxChildren = child;
            break;
          }
        }

        // Check if typeArguments is in typeName children
        let typeArgsInTypeNameChildren: any = null;
        for (const child of typeNameChildren) {
          if (child.constructor.name === 'TypeArgumentsContext') {
            typeArgsInTypeNameChildren = child;
            break;
          }
        }

        if (
          ctxTypeArgs ||
          typeNameTypeArgs ||
          typeArgsInCtxChildren ||
          typeArgsInTypeNameChildren
        ) {
          const foundTypeArgs =
            typeArgsInCtxChildren ||
            typeArgsInTypeNameChildren ||
            ctxTypeArgs ||
            typeNameTypeArgs;
          this.logger.debug(
            () =>
              `[TYPE_REF] Found typeArguments! ctx.typeArguments=${!!ctxTypeArgs}, ` +
              `typeName.typeArguments=${!!typeNameTypeArgs}, ` +
              `typeArgsInCtxChildren=${!!typeArgsInCtxChildren}, ` +
              `typeArgsInTypeNameChildren=${!!typeArgsInTypeNameChildren}`,
          );
          // Use the found typeArguments
          if (!typeArgsOnBase && foundTypeArgs) {
            // Update typeArgsOnBase to use the found typeArguments
            (baseTypeName as any).__foundTypeArgs = foundTypeArgs;
          }
        }
      }

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

      // Also capture generic type parameters if this type has them
      // For type declarations like "List<String>", we need to capture the generic parameter
      // Check if TypeRefContext has typeArguments (generic parameters)
      // Try TypeRefContext, TypeNameContext (baseTypeName), and parent contexts
      let typeArgs = (ctx as any).typeArguments?.();
      if (!typeArgs) {
        typeArgs = typeArgsOnBase;
      }
      if (!typeArgs) {
        typeArgs = (typeName as any).typeArguments?.();
      }

      // If still not found and this is a type declaration, manually search the parse tree
      // The grammar shows typeName can have typeArguments, so search children of typeName
      if (!typeArgs && isTypeDeclaration) {
        // Check children of typeName for TypeArgumentsContext
        const typeNameChildren = (typeName as any).children || [];
        for (const child of typeNameChildren) {
          if (child.constructor.name === 'TypeArgumentsContext') {
            typeArgs = child;
            this.logger.debug(
              () =>
                '[TYPE_REF] Found TypeArgumentsContext in typeName.children for type declaration',
            );
            break;
          }
        }
        // Also check children of ctx (TypeRefContext) for TypeArgumentsContext
        if (!typeArgs) {
          const ctxChildren = (ctx as any).children || [];
          for (const child of ctxChildren) {
            if (child.constructor.name === 'TypeArgumentsContext') {
              typeArgs = child;
              this.logger.debug(
                () =>
                  '[TYPE_REF] Found TypeArgumentsContext in ctx.children for type declaration',
              );
              break;
            }
          }
        }
      }
      // Also check parent LocalVariableDeclarationContext for typeArguments
      // Walk up the parse tree to find TypeArgumentsContext
      if (!typeArgs && isTypeDeclaration) {
        let walkParent: ParserRuleContext | undefined = ctx.parent;
        let depth = 0;
        while (walkParent && depth < 10) {
          // Check if this parent is a LocalVariableDeclarationContext
          if (
            walkParent.constructor.name === 'LocalVariableDeclarationContext'
          ) {
            const parentTypeRef = (walkParent as any).typeRef?.();
            if (parentTypeRef) {
              // Check if TypeArgumentsContext is a child of TypeRefContext
              const typeRefChildren = (parentTypeRef as any).children || [];
              for (const child of typeRefChildren) {
                if (child.constructor.name === 'TypeArgumentsContext') {
                  typeArgs = child;
                  this.logger.debug(
                    () =>
                      '[TYPE_REF] Found TypeArgumentsContext as child of ' +
                      'TypeRefContext in LocalVariableDeclarationContext',
                  );
                  break;
                }
              }
              // Also try the method call approach
              if (!typeArgs) {
                typeArgs = (parentTypeRef as any).typeArguments?.();
              }
              if (!typeArgs) {
                const parentTypeNames = (parentTypeRef as any).typeName?.();
                if (parentTypeNames && parentTypeNames.length > 0) {
                  // Check children of typeName for TypeArgumentsContext
                  const typeNameChildren =
                    (parentTypeNames[0] as any).children || [];
                  for (const child of typeNameChildren) {
                    if (child.constructor.name === 'TypeArgumentsContext') {
                      typeArgs = child;
                      this.logger.debug(
                        () =>
                          '[TYPE_REF] Found TypeArgumentsContext as child of TypeNameContext',
                      );
                      break;
                    }
                  }
                  if (!typeArgs) {
                    typeArgs = (parentTypeNames[0] as any).typeArguments?.();
                  }
                }
              }
            }
            break;
          }
          walkParent = walkParent.parent;
          depth++;
        }
      }
      this.logger.debug(
        () =>
          '[TYPE_REF] Checking for typeArguments: ' +
          `ctx.typeArguments=${!!(ctx as any).typeArguments?.()}, ` +
          `baseTypeName.typeArguments=${!!typeArgsOnBase}, ` +
          `typeName.typeArguments=${!!(typeName as any).typeArguments?.()}, ` +
          `parent.typeRef.typeArguments=${
            isTypeDeclaration &&
            ctx.parent?.constructor.name === 'LocalVariableDeclarationContext'
              ? !!((ctx.parent as any).typeRef?.() as any)?.typeArguments?.()
              : false
          }`,
      );
      if (typeArgs) {
        this.logger.debug(
          () =>
            '[TYPE_REF] Found typeArguments for type declaration ' +
            `at ${ctx.start?.line}:${ctx.start?.charPositionInLine}`,
        );
        const typeList = typeArgs.typeList();
        if (typeList) {
          const genericTypeRefs = typeList.typeRef();
          for (const genericTypeRef of genericTypeRefs) {
            const genericTypeNames = genericTypeRef.typeName();
            if (!genericTypeNames || genericTypeNames.length === 0) continue;

            const genericTypeName = genericTypeNames[0];
            if (!genericTypeName) continue;

            const genericIdNode = genericTypeName.id();
            if (!genericIdNode) continue;

            const genericLocation = this.getLocationForReference(genericIdNode);

            this.logger.debug(
              () =>
                `[TYPE_REF] Creating generic parameter reference for "${genericIdNode.text}" ` +
                `at ${genericLocation.identifierRange.startLine}:${genericLocation.identifierRange.startColumn}-` +
                `${genericLocation.identifierRange.endLine}:${genericLocation.identifierRange.endColumn}`,
            );

            const genericReference =
              SymbolReferenceFactory.createGenericParameterTypeReference(
                genericIdNode.text,
                genericLocation,
                parentContext,
              );
            this.symbolTable.addTypeReference(genericReference);
          }
        }
      }
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

      // Skip if parent is a method call - exitDotMethodCall will handle this with METHOD_CALL context
      // This prevents duplicate chain nodes with conflicting contexts
      if (ctx.parent instanceof DotMethodCallContext) {
        return;
      }

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
   * This captures both left-hand and right-hand side of assignments
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
        // Manually capture array base and index as reads (they're needed to compute the write target)
        if (isContextType(leftExpression, ArrayExpressionContext)) {
          const arrayExpr = leftExpression;
          const expressions = (arrayExpr as any).expression?.();
          const arrayBaseExpression =
            Array.isArray(expressions) && expressions.length > 0
              ? expressions[0]
              : (expressions ?? null);

          // Extract and create read references for array base (e.g., "arr" in "arr[i]")
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
                  'read', // Array base is read to compute the write target
                );
              this.symbolTable.addTypeReference(arrayRef);
            }
          }

          // Extract and create read references for index expression (e.g., "i" in "arr[i]")
          // ArrayExpressionContext has index as expression(1), not expressionList
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
                  'read', // Index is read to compute the write target
                );
              this.symbolTable.addTypeReference(indexRef);
            }
          }

          // Note: We don't create a write reference for the array element itself
          // because array element writes are handled differently than variable writes
          return;
        }

        // For other complex LHS, we avoid emitting flattened refs; let child listeners capture reads
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
   * Capture enhanced for control references (e.g., "for (Type var : collection)")
   */
  enterEnhancedForControl(ctx: EnhancedForControlContext): void {
    try {
      const typeRef = ctx.typeRef();
      if (typeRef) {
        const typeName = this.extractTypeNameFromTypeRef(typeRef);
        const location = this.getLocation(ctx);
        const reference = SymbolReferenceFactory.createTypeDeclarationReference(
          typeName,
          location,
          this.determineTypeReferenceContext(ctx),
        );
        this.symbolTable.addTypeReference(reference);
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing enhanced for control: ${error}`);
    }
  }

  /**
   * Capture when value references in switch statements (e.g., "when Type var")
   */
  enterWhenValue(ctx: WhenValueContext): void {
    try {
      // whenValue can be ELSE or typeRef id
      const typeRef = (ctx as any).typeRef?.();
      if (typeRef) {
        const typeName = this.extractTypeNameFromTypeRef(typeRef);
        const location = this.getLocation(ctx);
        const reference = SymbolReferenceFactory.createTypeDeclarationReference(
          typeName,
          location,
          this.determineTypeReferenceContext(ctx),
        );
        this.symbolTable.addTypeReference(reference);
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing when value: ${error}`);
    }
  }

  /**
   * Capture instanceof expression references (e.g., "obj instanceof Type")
   */
  enterInstanceOfExpression(ctx: InstanceOfExpressionContext): void {
    try {
      const typeRef = (ctx as any).typeRef?.();
      if (typeRef) {
        const typeName = this.extractTypeNameFromTypeRef(typeRef);
        const location = this.getLocation(ctx);
        const reference = SymbolReferenceFactory.createInstanceOfTypeReference(
          typeName,
          location,
          this.getCurrentMethodName(),
        );
        this.symbolTable.addTypeReference(reference);
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing instanceof expression: ${error}`);
    }
  }

  /**
   * Capture type ref primary references (e.g., "String.class")
   */
  enterTypeRefPrimary(ctx: TypeRefPrimaryContext): void {
    try {
      const typeRef = (ctx as any).typeRef?.();
      if (typeRef) {
        const typeName = this.extractTypeNameFromTypeRef(typeRef);
        const location = this.getLocation(ctx);
        const reference = SymbolReferenceFactory.createClassReference(
          typeName,
          location,
          this.getCurrentMethodName(),
        );
        this.symbolTable.addTypeReference(reference);
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing type ref primary: ${error}`);
    }
  }

  /**
   * Capture type list in generic types (for type declarations like List<ClassName>)
   * This handles generic type parameters in variable declarations, not just in new expressions
   */
  enterTypeList(ctx: TypeListContext): void {
    try {
      this.logger.debug(
        () =>
          `[TYPE_LIST] enterTypeList called at ${ctx.start?.line}:${ctx.start?.charPositionInLine}`,
      );

      // Check if we're inside typeArguments - if so, let enterTypeArguments handle it
      let current: ParserRuleContext | undefined = ctx.parent;
      let depth = 0;
      let foundTypeArguments = false;
      let foundNewExpression = false;
      let foundTypeDeclaration = false;
      let typeDeclarationContext: ParserRuleContext | null = null;

      while (current && depth < 20) {
        this.logger.debug(
          () =>
            `[TYPE_LIST] Checking parent at depth ${depth}: ${current?.constructor.name}`,
        );
        if (current && isContextType(current, TypeArgumentsContext)) {
          foundTypeArguments = true;
          this.logger.debug(
            () => `[TYPE_LIST] Inside TypeArgumentsContext at depth ${depth}`,
          );
          // Don't return yet - we need to check if we're also in a type declaration
        }
        // Check if we're in a constructor call (NewExpressionContext)
        if (current && isContextType(current, NewExpressionContext)) {
          foundNewExpression = true;
          this.logger.debug(
            () => `[TYPE_LIST] Inside NewExpressionContext at depth ${depth}`,
          );
          // Don't return yet - we need to check if we're also in a type declaration
        }
        // Check if we're in a type declaration (LocalVariableDeclarationContext, FieldDeclarationContext, etc.)
        const isTypeDecl =
          current &&
          (current.constructor.name === 'LocalVariableDeclarationContext' ||
            current.constructor.name === 'FieldDeclarationContext' ||
            current.constructor.name === 'PropertyDeclarationContext');
        if (isTypeDecl && current) {
          foundTypeDeclaration = true;
          typeDeclarationContext = current;
          const currentName = current.constructor.name;
          this.logger.debug(
            () =>
              `[TYPE_LIST] Found type declaration context: ${currentName} at depth ${depth}`,
          );
          // Don't break - continue to see the full parent chain
        }
        current = current.parent;
        depth++;
      }

      // If we're in a type declaration but NOT in a NewExpressionContext, process it here
      // (NewExpressionContext means it's a constructor call, which is handled elsewhere)
      if (
        foundTypeDeclaration &&
        !foundNewExpression &&
        typeDeclarationContext
      ) {
        this.logger.debug(
          () =>
            '[TYPE_LIST] Processing type declaration (not constructor call)',
        );
        // This is a type declaration with generic parameters - capture them
        const typeRefs = ctx.typeRef();
        if (!typeRefs || typeRefs.length === 0) return;

        const parentContext = this.determineTypeReferenceContext(
          typeDeclarationContext,
        );

        for (const typeRef of typeRefs) {
          const typeNames = typeRef.typeName();
          if (!typeNames || typeNames.length === 0) continue;

          const typeName = typeNames[0];
          if (!typeName) continue;

          // Get the identifier node from the typeName - this is the actual class name
          const idNode = typeName.id();
          if (!idNode) continue;

          // Use getLocationForReference on the idNode (TerminalNode) for precise location
          const location = this.getLocationForReference(idNode);

          this.logger.debug(
            () =>
              `[TYPE_LIST] Creating generic parameter reference for "${idNode.text}" ` +
              `at ${location.identifierRange.startLine}:${location.identifierRange.startColumn}-` +
              `${location.identifierRange.endLine}:${location.identifierRange.endColumn}`,
          );

          const genericReference =
            SymbolReferenceFactory.createGenericParameterTypeReference(
              idNode.text,
              location,
              parentContext,
            );
          this.symbolTable.addTypeReference(genericReference);
        }
        return;
      }

      // If we're inside TypeArgumentsContext but NOT in a type declaration, let enterTypeArguments handle it
      if (foundTypeArguments && !foundTypeDeclaration) {
        this.logger.debug(
          () =>
            '[TYPE_LIST] Inside TypeArgumentsContext (not type declaration), skipping',
        );
        return;
      }

      // If we're in a constructor call, skip (handled by enterTypeArguments or captureConstructorCallReference)
      if (foundNewExpression) {
        this.logger.debug(
          () => '[TYPE_LIST] Inside NewExpressionContext, skipping',
        );
        return;
      }
    } catch (error) {
      this.logger.warn(() => `Error capturing type list: ${error}`);
    }
  }

  /**
   * Capture type arguments in generic types
   */
  enterTypeArguments(ctx: TypeArgumentsContext): void {
    try {
      this.logger.debug(
        () =>
          `[TYPE_ARGS] enterTypeArguments called at ${ctx.start?.line}:${ctx.start?.charPositionInLine}`,
      );

      // Check if we're in a type declaration context (LocalVariableDeclarationContext, FieldDeclarationContext, etc.)
      let walkParent: ParserRuleContext | undefined = ctx.parent;
      let depth = 0;
      let isInTypeDeclaration = false;
      while (walkParent && depth < 10) {
        const parentName = walkParent.constructor.name;
        if (
          parentName === 'LocalVariableDeclarationContext' ||
          parentName === 'FieldDeclarationContext' ||
          parentName === 'PropertyDeclarationContext'
        ) {
          isInTypeDeclaration = true;
          this.logger.debug(
            () =>
              `[TYPE_ARGS] Found type declaration context: ${parentName} at depth ${depth}`,
          );
          break;
        }
        walkParent = walkParent.parent;
        depth++;
      }

      const typeList = ctx.typeList();
      if (!typeList) {
        this.logger.debug(() => '[TYPE_ARGS] No typeList found');
        return;
      }

      const typeRefs = typeList.typeRef();
      if (!typeRefs || typeRefs.length === 0) {
        this.logger.debug(() => '[TYPE_ARGS] No typeRefs found');
        return;
      }

      this.logger.debug(
        () =>
          `[TYPE_ARGS] Processing ${typeRefs.length} type references, isInTypeDeclaration=${isInTypeDeclaration}`,
      );

      for (const typeRef of typeRefs) {
        const typeNames = typeRef.typeName();
        if (!typeNames || typeNames.length === 0) continue;

        const typeName = typeNames[0];
        if (!typeName) continue;

        // Get the identifier node from the typeName - this is the actual class name
        const idNode = typeName.id();
        if (!idNode) {
          this.logger.debug(() => '[TYPE_ARGS] No idNode found for typeName');
          continue;
        }

        // For type declarations, determine context by walking up to find the method or type
        let parentContext: string | undefined;
        if (isInTypeDeclaration) {
          // Walk up to find the method or type context
          let contextParent: ParserRuleContext | undefined = ctx.parent;
          let contextDepth = 0;
          while (contextParent && contextDepth < 15) {
            const contextName = contextParent.constructor.name;
            if (
              contextName === 'MethodDeclarationContext' ||
              contextName === 'ConstructorDeclarationContext'
            ) {
              // Extract method name from context
              const methodId = (contextParent as any).id?.();
              parentContext = methodId?.text || this.getCurrentMethodName();
              break;
            }
            if (
              contextName === 'ClassDeclarationContext' ||
              contextName === 'InterfaceDeclarationContext'
            ) {
              const classId = (contextParent as any).id?.();
              parentContext = classId?.text;
              break;
            }
            contextParent = contextParent.parent;
            contextDepth++;
          }
          if (!parentContext) {
            parentContext = this.getCurrentMethodName();
          }
        } else {
          parentContext = this.determineTypeReferenceContext(typeRef);
        }

        // Use getLocationForReference on the idNode (TerminalNode) for precise location
        const location = this.getLocationForReference(idNode);

        this.logger.debug(
          () =>
            `[TYPE_ARGS] Creating generic parameter reference for "${idNode.text}" ` +
            `at ${location.identifierRange.startLine}:${location.identifierRange.startColumn}-` +
            `${location.identifierRange.endLine}:${location.identifierRange.endColumn}, ` +
            `parentContext=${parentContext}, isInTypeDeclaration=${isInTypeDeclaration}`,
        );

        const genericReference =
          SymbolReferenceFactory.createGenericParameterTypeReference(
            idNode.text,
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
   * Get the TYPE_DECLARATION reference for a local variable declaration context
   * This allows primary listeners to link TypeInfo to references
   */
  getTypeDeclarationReference(
    localVarDeclCtx: ParserRuleContext,
  ): SymbolReference | undefined {
    return this.localVarDeclToTypeRefMap.get(localVarDeclCtx);
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
        // Handle collection types (List, Set, Map)
        const collectionType = listToken ? 'List' : setToken ? 'Set' : 'Map';
        const token = listToken || setToken || mapToken;
        const typeNameCtx = createdNameTypeName || pairTypeName;

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
        const ctorRef = SymbolReferenceFactory.createConstructorCallReference(
          collectionType,
          location,
          parentContext,
        );

        // Check if this constructor call has arguments (classCreatorRest)
        const classCreatorRest = (creator as any).classCreatorRest?.();
        if (classCreatorRest) {
          this.methodCallStack.push({
            callRef: ctorRef,
            parameterRefs: [],
          });
        }

        this.symbolTable.addTypeReference(ctorRef);
        return;
      }

      // Handle regular class names (not List/Set/Map)
      // For constructor calls like "new AccountAutoDeletionSettingsVMapper()", the parser structure is:
      // createdName -> idCreatedNamePair[0] -> anyId()
      const idCreatedNamePairs = createdName.idCreatedNamePair();
      if (!idCreatedNamePairs || idCreatedNamePairs.length === 0) return;

      const firstPair = idCreatedNamePairs[0];
      const anyId = firstPair.anyId();
      if (!anyId) return;

      const className = anyId.text;
      const location = this.getLocationForReference(anyId);

      this.logger.debug(
        () =>
          `[CONSTRUCTOR_CALL] Created reference for "${className}" at ` +
          `${location.identifierRange.startLine}:${location.identifierRange.startColumn}-` +
          `${location.identifierRange.endLine}:${location.identifierRange.endColumn}`,
      );

      const parentContext = this.getCurrentMethodName();

      const reference = SymbolReferenceFactory.createConstructorCallReference(
        className,
        location,
        parentContext,
      );

      // Check if this constructor call has arguments (classCreatorRest)
      const classCreatorRest = (creator as any).classCreatorRest?.();
      if (classCreatorRest) {
        this.methodCallStack.push({
          callRef: reference,
          parameterRefs: [],
        });
      }

      this.symbolTable.addTypeReference(reference);

      // Handle dotted names (e.g., Namespace.Type)
      if (idCreatedNamePairs.length > 1) {
        for (let i = 1; i < idCreatedNamePairs.length; i++) {
          const pair = idCreatedNamePairs[i];
          const anyId = pair.anyId();
          if (anyId) {
            const dottedTypeName = anyId.text;
            const dottedLocation = this.getLocationForReference(anyId);

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

    // Even if there are no chain nodes, we might still need to create a reference
    // for the base expression (e.g., FileUtilities.createFile() where baseExpression='FileUtilities')
    // However, if there are chain nodes, create the full chain reference
    if (chainScope.chainNodes.length > 0) {
      this.createChainRootReference(chainScope);
    }
    // Note: If chainNodes.length === 0, the base expression might still be captured
    // by other listeners (e.g., enterIdPrimary), so we don't need to create a reference here
  }

  private createChainRootReference(chainScope: ChainScope): void {
    try {
      const { baseExpression, chainNodes, startLocation } = chainScope;

      this.logger.debug(
        () =>
          `[CHAIN_ROOT] Creating chain root reference: baseExpression="${baseExpression}", ` +
          `chainNodes.length=${chainNodes.length}`,
      );

      if (baseExpression === 'this') {
        this.logger.debug(
          () =>
            `[CHAIN_ROOT] Detected 'this' chain with ${chainNodes.length} nodes`,
        );
        // Log all chain nodes BEFORE filtering
        chainNodes.forEach((node, idx) => {
          this.logger.debug(
            () =>
              `[CHAIN_ROOT] Chain node ${idx}: name="${node.name}", context=${node.context}`,
          );
        });
        const parentContext = this.getCurrentMethodName();

        // Create individual member access references (for backward compatibility)
        chainNodes.forEach((chainNode) => {
          // Preserve the original context (METHOD_CALL, FIELD_ACCESS, etc.)
          // Only change CHAIN_STEP to FIELD_ACCESS for field access
          const finalContext =
            chainNode.context === ReferenceContext.CHAIN_STEP
              ? ReferenceContext.FIELD_ACCESS
              : chainNode.context;

          this.logger.debug(
            () =>
              `[CHAIN_ROOT] Creating memberRef for "${chainNode.name}" ` +
              `with context ${finalContext} ` +
              `at ${chainNode.location.identifierRange.startLine}:${chainNode.location.identifierRange.startColumn}-` +
              `${chainNode.location.identifierRange.endLine}:${chainNode.location.identifierRange.endColumn}`,
          );

          const memberRef = new EnhancedSymbolReference(
            chainNode.name,
            chainNode.location,
            finalContext,
            undefined,
            parentContext,
          );
          this.symbolTable.addTypeReference(memberRef);
        });

        // Also create a ChainedSymbolReference for precise position-based resolution
        // This allows getSymbolAtPositionPrecise to find the specific chain member
        if (chainNodes.length > 0) {
          // Filter out any invalid chain nodes (nodes with names that include parentheses or 'this.')
          // These shouldn't be in the chain nodes array
          // Also remove duplicates by keeping only the first occurrence of each method name
          this.logger.debug(
            () =>
              `[THIS_CHAIN] Filtering ${chainNodes.length} chain nodes for 'this' chain`,
          );
          const seenNames = new Set<string>();
          const validChainNodes = chainNodes.filter((node) => {
            const name = node.name;
            // Exclude nodes that look like full expressions (contain 'this.' or '()')
            if (name.includes('this.') || name.includes('()')) {
              this.logger.debug(
                () => `[THIS_CHAIN] Filtering out invalid node: "${name}"`,
              );
              return false;
            }
            // Remove duplicates - keep only the first occurrence
            if (seenNames.has(name)) {
              this.logger.debug(
                () => `[THIS_CHAIN] Filtering out duplicate node: "${name}"`,
              );
              return false;
            }
            seenNames.add(name);
            return true;
          });
          this.logger.debug(
            () =>
              `[THIS_CHAIN] After filtering: ${validChainNodes.length} valid chain nodes`,
          );

          // Only create chained reference if we have valid chain nodes
          if (validChainNodes.length > 0) {
            // Create the full expression string
            const fullExpression = `this.${validChainNodes.map((s) => s.name).join('.')}`;
            const finalLocation =
              validChainNodes.length > 0
                ? validChainNodes[validChainNodes.length - 1].location
                : startLocation;

            // Create chained expression location
            const chainedExpressionLocation = this.createChainedExpression(
              fullExpression,
              startLocation,
              finalLocation,
            );

            // Create a SymbolReference for the chained expression
            const chainedExpression: SymbolReference = {
              name: fullExpression,
              location: chainedExpressionLocation,
              context: ReferenceContext.CHAINED_TYPE,
              parentContext,
            };

            // Create root reference with valid chain nodes only
            // Note: For 'this' chains, we don't include 'this' as a chain node,
            // only the actual method/property calls
            const rootRef =
              SymbolReferenceFactory.createChainedExpressionReference(
                validChainNodes,
                chainedExpression,
                parentContext,
              );

            this.symbolTable.addTypeReference(rootRef);
          }
        }
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

      // Debug: Log analyzed chain node contexts
      analyzedChainNodes.forEach((node, idx) => {
        this.logger.debug(
          () =>
            `[CHAIN_ROOT] Analyzed node ${idx}: name="${node.name}", ` +
            `context=${ReferenceContext[node.context] ?? node.context}`,
        );
      });

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

      // Also create a VARIABLE_USAGE reference for the base qualifier
      // This is needed for reference correction tests and ensures the qualifier
      // is captured even when reference correction is disabled
      const baseVarRef = SymbolReferenceFactory.createVariableUsageReference(
        baseExpression,
        baseExpressionLocation,
        this.getCurrentMethodName(),
      );
      this.symbolTable.addTypeReference(baseVarRef);
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
    // First check context set by primary listener
    if (this.currentMethodName !== undefined) {
      return this.currentMethodName;
    }
    // Fall back to methodCallStack for nested method calls within expressions
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
    // Check cache first
    const cached = this.typeDeclarationCache.get(ctx);
    if (cached !== undefined) {
      return cached;
    }

    let current: ParserRuleContext | undefined = ctx.parent;
    let depth = 0;
    while (current && depth < 15) {
      const name = current.constructor.name;
      if (
        name === 'LocalVariableDeclarationContext' ||
        name === 'FieldDeclarationContext' ||
        name === 'PropertyDeclarationContext'
      ) {
        this.typeDeclarationCache.set(ctx, true);
        return true;
      }
      if (
        name === 'MethodDeclarationContext' ||
        name === 'ConstructorDeclarationContext' ||
        name === 'InterfaceMethodDeclarationContext'
      ) {
        this.typeDeclarationCache.set(ctx, false);
        return false;
      }
      current = current.parent;
      depth++;
    }
    this.typeDeclarationCache.set(ctx, false);
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
    // Primary path: Use context set by primary listener
    if (this.currentMethodName !== undefined) {
      return this.currentMethodName;
    }
    if (this.currentTypeName !== undefined) {
      return this.currentTypeName;
    }

    // Check cache for this context node
    const cached = this.contextNameCache.get(ctx);
    if (cached !== undefined) {
      return cached;
    }

    // Fallback path: Only walk parse tree if context not explicitly set (for standalone usage)
    // Traverse up the parse tree to find the appropriate context
    let current: ParserRuleContext | undefined =
      ctx instanceof TypeRefContext ? ctx.parent : ctx;

    while (current) {
      const name = current.constructor.name;

      // Check for method-related contexts
      if (
        name === 'MethodDeclarationContext' ||
        name === 'ConstructorDeclarationContext' ||
        name === 'InterfaceMethodDeclarationContext'
      ) {
        const result = this.getCurrentMethodName();
        this.contextNameCache.set(ctx, result);
        return result;
      }

      // Check for field/property/type declaration contexts
      if (
        name === 'LocalVariableDeclarationContext' ||
        name === 'FieldDeclarationContext' ||
        name === 'PropertyDeclarationContext'
      ) {
        // For type declarations, return the method name if in a method, otherwise try to get type name
        const methodName = this.getCurrentMethodName();
        if (methodName) {
          this.contextNameCache.set(ctx, methodName);
          return methodName;
        }
        // Try to get type name by walking up further
        let typeParent: ParserRuleContext | undefined = current.parent;
        while (typeParent) {
          if (
            typeParent.constructor.name === 'ClassDeclarationContext' ||
            typeParent.constructor.name === 'InterfaceDeclarationContext'
          ) {
            const typeId = (typeParent as any).id?.();
            const result = typeId?.text;
            this.contextNameCache.set(ctx, result);
            return result;
          }
          typeParent = typeParent.parent;
        }
        this.contextNameCache.set(ctx, undefined);
        return undefined;
      }

      current = current.parent;
    }

    // Fallback to current method context
    const finalResult = this.getCurrentMethodName();
    this.contextNameCache.set(ctx, finalResult);
    return finalResult;
  }

  private extractBaseExpressionFromParser(ctx: DotExpressionContext): string {
    try {
      const expressions = (ctx as any).expression?.();
      const leftExpression =
        Array.isArray(expressions) && expressions.length > 0
          ? expressions[0]
          : (expressions ?? null);

      if (leftExpression) {
        // Check for THIS keyword explicitly first
        // THIS keyword can appear in PrimaryExpressionContext
        if (isContextType(leftExpression, PrimaryExpressionContext)) {
          const primaryExpr = leftExpression as PrimaryExpressionContext;
          const primary = primaryExpr.primary?.();
          if (primary) {
            // Check if primary contains THIS token
            const thisToken = (primary as any).THIS?.();
            if (thisToken) {
              this.logger.debug(
                () =>
                  '[EXTRACT_BASE] Found THIS token in PrimaryExpressionContext',
              );
              return 'this';
            }
          }
        }

        // Also check directly on the expression context for THIS token
        const thisTokenDirect = (leftExpression as any).THIS?.();
        if (thisTokenDirect) {
          this.logger.debug(
            () => '[EXTRACT_BASE] Found THIS token directly on expression',
          );
          return 'this';
        }

        // If leftExpression is a DotExpressionContext, recursively extract the base
        // This handles nested chains like "this.method().anotherMethod()"
        if (isContextType(leftExpression, DotExpressionContext)) {
          const nestedBase = this.extractBaseExpressionFromParser(
            leftExpression as DotExpressionContext,
          );
          this.logger.debug(
            () =>
              `[EXTRACT_BASE] Recursively extracted base from nested DotExpression: "${nestedBase}"`,
          );
          return nestedBase;
        }

        // Use extractIdentifiersFromExpression to get only identifiers, not method calls
        const identifiers =
          this.extractIdentifiersFromExpression(leftExpression);
        const result = identifiers.length > 0 ? identifiers[0] : 'unknown';
        this.logger.debug(
          () =>
            `[EXTRACT_BASE] Extracted base expression: "${result}" from ${identifiers.length} identifiers`,
        );
        // Warn if the result contains parentheses or 'this.' - this shouldn't happen
        if (result.includes('()') || result.includes('this.')) {
          this.logger.warn(
            () =>
              `[EXTRACT_BASE] WARNING: Base expression contains invalid characters: "${result}"`,
          );
        }
        return result;
      }
      this.logger.debug(
        () => "[EXTRACT_BASE] No leftExpression found, returning 'unknown'",
      );
      return 'unknown';
    } catch (error) {
      this.logger.warn(
        () => `Error extracting base expression from parser: ${error}`,
      );
      return 'unknown';
    }
  }

  private extractIdentifiersFromExpression(expr: any): string[] {
    const identifiers: string[] = [];

    if (!expr) return [];

    // Handle IdPrimaryContext (simple identifier)
    if (isContextType(expr, IdPrimaryContext)) {
      const idNode = (expr as IdPrimaryContext).id();
      if (idNode) {
        identifiers.push(idNode.text);
      }
      return identifiers;
    }

    // Handle DotExpressionContext (obj.field or obj.method())
    // Recursively extract from base expression, then add the field/method name
    if (isContextType(expr, DotExpressionContext)) {
      const dotExpression = expr as DotExpressionContext;
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

    // Handle simple identifier node
    if (expr.id) {
      const id = expr.id();
      if (id) {
        identifiers.push(id.text);
        return identifiers;
      }
    }

    // Fallback: try to extract from children
    if (expr.children) {
      for (const child of expr.children) {
        if (child.id) {
          const id = child.id();
          if (id) {
            identifiers.push(id.text);
          }
        } else if (
          child.text &&
          !child.text.includes('(') &&
          !child.text.includes('.')
        ) {
          // Only use text if it doesn't contain parentheses or dots (which indicate complex expressions)
          identifiers.push(child.text);
        }
      }
    }

    // Last resort: use text property only if it's a simple identifier (no parentheses, no dots)
    if (identifiers.length === 0 && expr.text) {
      const text = expr.text;
      // Only use text if it looks like a simple identifier (no parentheses, no dots)
      if (!text.includes('(') && !text.includes('.')) {
        identifiers.push(text);
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
    // Try to extract identifier range from context (for method names, variable names, etc.)
    const identifierRange = this.getIdentifierRangeForContext(ctx);

    return {
      symbolRange: {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop?.line ?? ctx.start.line,
        endColumn:
          (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
          (ctx.stop?.text?.length ?? 0),
      },
      identifierRange: identifierRange || {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop?.line ?? ctx.start.line,
        endColumn:
          (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
          (ctx.stop?.text?.length ?? 0),
      },
    };
  }

  /**
   * Extract the precise range of the identifier from a parser context
   * For method calls, extracts the method name (id() node)
   * For other contexts, attempts to find the identifier node
   */
  private getIdentifierRangeForContext(ctx: ParserRuleContext): {
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

    // Strategy 2: Check if context is AnyIdContext (e.g., from anyId() calls in dot expressions)
    // AnyIdContext IS the identifier itself, so use its start/stop directly
    // Match the deprecated listener's behavior: use start/stop for AnyIdContext
    if (ctx && isContextType(ctx, AnyIdContext)) {
      // For AnyIdContext, use ctx.text to get the identifier text
      // This is more reliable than calculating from stop/start positions
      const text = (ctx as any).text || ctx.stop?.text || ctx.start?.text || '';
      const textLength =
        text.length > 0
          ? text.length
          : (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) -
            ctx.start.charPositionInLine +
            (ctx.start.text?.length || 0);

      return {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop?.line ?? ctx.start.line,
        endColumn: ctx.start.charPositionInLine + textLength,
      };
    }

    // Strategy 2b: Fallback for other contexts with start/stop (but not AnyIdContext)
    // This handles cases where the context itself represents an identifier
    if (ctx && ctx.start && ctx.stop && ctx.start !== ctx.stop) {
      // Use the context's text property if available, otherwise calculate from positions
      const text = (ctx as any).text || ctx.stop.text || ctx.start.text || '';
      const textLength =
        text.length > 0
          ? text.length
          : ctx.stop.charPositionInLine -
            ctx.start.charPositionInLine +
            (ctx.start.text?.length || 0);

      return {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop.line,
        endColumn: ctx.start.charPositionInLine + textLength,
      };
    }

    // Strategy 3: Check if context itself is a single token (TerminalNode-like)
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

  private getLocationForReference(ctx: any): SymbolLocation {
    // Handle TerminalNode (from id() calls) - has symbol property instead of start/stop
    if (ctx.symbol && typeof ctx.symbol.line === 'number') {
      const token = ctx.symbol;
      const text = ctx.text || token.text || '';
      const location: SymbolLocation = {
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
      this.logger.debug(
        () =>
          `[getLocationForReference] TerminalNode: "${text}" at ` +
          `${location.identifierRange.startLine}:${location.identifierRange.startColumn}-` +
          `${location.identifierRange.endLine}:${location.identifierRange.endColumn}`,
      );
      return location;
    }

    // Handle ParserRuleContext - has start and stop properties
    if (ctx.start && ctx.stop) {
      const location = this.getLocation(ctx as ParserRuleContext);
      this.logger.debug(
        () =>
          '[getLocationForReference] ParserRuleContext: at ' +
          `${location.identifierRange.startLine}:${location.identifierRange.startColumn}-` +
          `${location.identifierRange.endLine}:${location.identifierRange.endColumn}`,
      );
      return location;
    }

    // Fallback: try to use as ParserRuleContext anyway
    const location = this.getLocation(ctx as ParserRuleContext);
    this.logger.debug(
      () =>
        '[getLocationForReference] Fallback: at ' +
        `${location.identifierRange.startLine}:${location.identifierRange.startColumn}-` +
        `${location.identifierRange.endLine}:${location.identifierRange.endColumn}`,
    );
    return location;
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
