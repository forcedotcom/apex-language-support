/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

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
  ContextClass: new (...args: any[]) => T
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
  ContextClass: Constructor<T>
): ctx is T {
  return ctx instanceof ContextClass;
}

/**
 * Type alias for constructor functions
 */
export type Constructor<T> = new (...args: any[]) => T;
