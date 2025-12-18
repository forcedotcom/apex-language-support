/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';
import {
  FormalParameterContext,
  MethodDeclarationContext,
  InterfaceMethodDeclarationContext,
  LocalVariableDeclarationContext,
  NewExpressionContext,
  CastExpressionContext,
  InstanceOfExpressionContext,
  EnhancedForControlContext,
  TypeRefPrimaryContext,
  FieldDeclarationContext,
  PropertyDeclarationContext,
  ClassDeclarationContext,
  InterfaceDeclarationContext,
  DotExpressionContext,
  DotMethodCallContext,
  TypeRefContext,
  TypeNameContext,
  VariableDeclaratorContext,
  InsertStatementContext,
  UpdateStatementContext,
  DeleteStatementContext,
  UndeleteStatementContext,
  UpsertStatementContext,
  ExpressionListContext,
  MethodCallContext,
} from '@apexdevtools/apex-parser';

/**
 * Generic type guard function for ParserRuleContext subclasses
 *
 * This utility provides a type-safe way to check if a parser context
 * is an instance of a specific context class, replacing the fragile
 * pattern of checking constructor names with instanceof.
 *
 * @param ctx The parser context to check
 * @param ContextClass The constructor of the context class to check against
 * @returns True if ctx is an instance of ContextClass
 *
 * @example
 * ```typescript
 * import { DotExpressionContext, MethodCallContext } from '@apexdevtools/apex-parser';
 *
 * if (isContextType(parent, DotExpressionContext)) {
 *   // TypeScript now knows parent is DotExpressionContext
 *   const dotContext = parent; // Fully typed
 * }
 *
 * if (isContextType(parent, MethodCallContext)) {
 *   // TypeScript now knows parent is MethodCallContext
 *   const methodContext = parent; // Fully typed
 * }
 * ```
 */
export function isContextType<T extends ParserRuleContext>(
  ctx: ParserRuleContext | undefined,
  ContextClass: new (...args: any[]) => T,
): ctx is T {
  return ctx instanceof ContextClass;
}

/**
 * Alternative type guard with Constructor type for better type safety
 *
 * @param ctx The parser context to check
 * @param ContextClass The constructor of the context class to check against
 * @returns True if ctx is an instance of ContextClass
 */
export function isContextTypeWithConstructor<T extends ParserRuleContext>(
  ctx: ParserRuleContext | undefined,
  ContextClass: Constructor<T>,
): ctx is T {
  return ctx instanceof ContextClass;
}

/**
 * Type alias for constructor functions
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Check if context is a method-related context
 * These contexts indicate that we're within a method-related scope where
 * method name resolution should be used.
 */
export function isMethodRelatedContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof FormalParameterContext ||
    ctx instanceof MethodDeclarationContext ||
    ctx instanceof InterfaceMethodDeclarationContext ||
    ctx instanceof LocalVariableDeclarationContext ||
    ctx instanceof NewExpressionContext ||
    ctx instanceof CastExpressionContext ||
    ctx instanceof InstanceOfExpressionContext ||
    ctx instanceof EnhancedForControlContext ||
    ctx instanceof TypeRefPrimaryContext
  );
}

/**
 * Check if context is a field or property declaration context
 */
export function isFieldOrPropertyContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof FieldDeclarationContext ||
    ctx instanceof PropertyDeclarationContext
  );
}

/**
 * Check if context is a type declaration context (class or interface)
 */
export function isTypeDeclarationContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof ClassDeclarationContext ||
    ctx instanceof InterfaceDeclarationContext
  );
}

/**
 * Check if context is a dot expression context (dot expression or dot method call)
 */
export function isDotExpressionContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof DotExpressionContext || ctx instanceof DotMethodCallContext
  );
}

/**
 * Check if context is a type reference context (type reference or type name)
 */
export function isTypeReferenceContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return ctx instanceof TypeRefContext || ctx instanceof TypeNameContext;
}

/**
 * Check if context is a variable or field declaration context
 * This includes field declarations, property declarations, local variable declarations,
 * and variable declarators.
 */
export function isVariableOrFieldDeclarationContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof FieldDeclarationContext ||
    ctx instanceof PropertyDeclarationContext ||
    ctx instanceof LocalVariableDeclarationContext ||
    ctx instanceof VariableDeclaratorContext
  );
}

/**
 * Check if context is a DML statement context
 * This includes insert, update, delete, undelete, and upsert statements.
 */
export function isDmlStatementContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof InsertStatementContext ||
    ctx instanceof UpdateStatementContext ||
    ctx instanceof DeleteStatementContext ||
    ctx instanceof UndeleteStatementContext ||
    ctx instanceof UpsertStatementContext
  );
}

/**
 * Check if context is a method declaration context
 * This includes both regular method declarations and interface method declarations.
 */
export function isMethodDeclarationContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof MethodDeclarationContext ||
    ctx instanceof InterfaceMethodDeclarationContext
  );
}

/**
 * Check if context is a method call context
 * This includes expression lists (method parameters), method calls, and dot method calls.
 */
export function isMethodCallContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof ExpressionListContext ||
    ctx instanceof MethodCallContext ||
    ctx instanceof DotMethodCallContext
  );
}
