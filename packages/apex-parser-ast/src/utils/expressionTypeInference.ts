/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  CastExpressionContext,
  ExpressionContext,
  IdPrimaryContext,
  LiteralPrimaryContext,
  MethodCallExpressionContext,
  NewExpressionContext,
  PrimaryExpressionContext,
  SubExpressionContext,
} from '@apexdevtools/apex-parser';

import { SymbolKind, SymbolTable } from '../types/symbol';
import type { MethodSymbol, VariableSymbol } from '../types/symbol';
import {
  ExpressionTypeInfo,
  resolveExpressionTypeRecursive,
} from '../semantics/validation/validators/ExpressionValidator';

/**
 * Resolve a bare type name that cannot be determined from the local file's
 * symbol table — e.g. the return type of a method declared in another file, or
 * a field reached through a receiver whose declaring type lives elsewhere.
 *
 * This is the cross-file seam. In the first cut it is backed by same-file
 * resolution (callers pass a lookup over the local {@link SymbolTable}); a later
 * change routes it through `chainResolution.resolveMemberInContext` +
 * `ISymbolManager` for true cross-file resolution without touching this module.
 *
 * Implementations return the correctly-cased Apex type name, or `null` when the
 * name cannot be resolved.
 */
export type CrossFileTypeLookup = (typeName: string) => string | null;

/** Options for {@link inferExpressionType}. */
export interface InferExpressionTypeOptions {
  /**
   * Optional cross-file resolver. When omitted, resolution is same-file only
   * (method-call return types and field access that cannot be resolved from the
   * local symbol table yield `null`, and the caller falls back to `Object`).
   */
  readonly lookupCrossFileType?: CrossFileTypeLookup;
}

/**
 * Canonical Apex casing for the primitive/lowercased type names that the shared
 * recursive resolver (and cast/literal handling) emit. The recursive resolver
 * lowercases everything, so composite results (`integer`, `boolean`, ...) are
 * normalized back to their canonical Apex spelling here. Names not in this map
 * (user-defined types) are returned verbatim from the leaf handlers, so they
 * never reach normalization lowercased.
 */
const CANONICAL_PRIMITIVE_CASING: ReadonlyMap<string, string> = new Map([
  ['blob', 'Blob'],
  ['boolean', 'Boolean'],
  ['date', 'Date'],
  ['datetime', 'Datetime'],
  ['decimal', 'Decimal'],
  ['double', 'Double'],
  ['id', 'Id'],
  ['integer', 'Integer'],
  ['long', 'Long'],
  ['object', 'Object'],
  ['string', 'String'],
  ['time', 'Time'],
]);

/**
 * Normalize a possibly-lowercased primitive type name to its canonical Apex
 * spelling. User-defined type names (not primitives) pass through unchanged.
 */
const canonicalizeTypeName = (typeName: string): string =>
  CANONICAL_PRIMITIVE_CASING.get(typeName.toLowerCase()) ?? typeName;

/**
 * Recover the author's casing for a (possibly-lowercased) type name using the
 * same-file symbol table. The shared recursive resolver lowercases user-defined
 * type names (`Account` → `account`), so composite results over custom types
 * would otherwise be emitted lowercased. Primitives resolve through the fixed
 * canonical map; for everything else we search the file's declared type spellings
 * — type declarations (class/interface/enum names) and the declared types of
 * variables/parameters/fields/properties — and return the first spelling whose
 * lowercase matches. Falls back to the input verbatim when no declaration is
 * found (Apex type names are case-insensitive, so the result still compiles).
 */
const recoverTypeCasing = (
  typeName: string,
  symbolTable: SymbolTable,
): string => {
  const primitive = CANONICAL_PRIMITIVE_CASING.get(typeName.toLowerCase());
  if (primitive) {
    return primitive;
  }

  const lower = typeName.toLowerCase();
  for (const symbol of symbolTable.getAllSymbols()) {
    // A type declaration's own name carries the canonical spelling.
    if (
      (symbol.kind === SymbolKind.Class ||
        symbol.kind === SymbolKind.Interface ||
        symbol.kind === SymbolKind.Enum) &&
      symbol.name?.toLowerCase() === lower
    ) {
      return symbol.name;
    }
    // A declared variable/field/parameter type carries the author's spelling.
    if (
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Property
    ) {
      const declaredName = (symbol as VariableSymbol).type?.name;
      if (declaredName && declaredName.toLowerCase() === lower) {
        return declaredName;
      }
    }
  }
  return typeName;
};

/** Unwrap parentheses so `(expr)` resolves as `expr`. */
const unwrapSubExpression = (expr: ExpressionContext): ExpressionContext => {
  let current = expr;
  while (current instanceof SubExpressionContext) {
    const inner = current.expression();
    if (!inner) {
      break;
    }
    current = inner;
  }
  return current;
};

/**
 * Resolve the type of a literal primary (e.g. `'x'`, `42`, `true`) with correct
 * Apex casing, or `null` when the primary is not a typed literal (`null`).
 */
const inferLiteralType = (literal: LiteralPrimaryContext): string | null => {
  const node = literal.literal();
  if (!node) {
    return null;
  }
  if (node.StringLiteral() || node.MultilineStringLiteral()) {
    return 'String';
  }
  if (node.IntegerLiteral()) {
    return 'Integer';
  }
  if (node.LongLiteral()) {
    return 'Long';
  }
  if (node.NumberLiteral()) {
    return 'Decimal';
  }
  if (node.BooleanLiteral()) {
    return 'Boolean';
  }
  // NULL literal carries no type information.
  return null;
};

/**
 * Look up a same-file variable/parameter/field AS SEEN AT the reference's source
 * position and return its declared type name verbatim (casing preserved), or
 * `null` when not found or untyped.
 *
 * Resolution is scope-aware: it walks the lexical block scopes enclosing the
 * reference (innermost first, then file root) via
 * {@link SymbolTable.resolveVariableAtPosition}. This is essential — a flat,
 * file-wide first-match-by-name scan can bind to a same-named local in an
 * unrelated sibling method (e.g. `Integer x` in one method vs `String x` in
 * another), yielding a wrong, non-compiling declared type for the extracted
 * declaration. The position comes from the reference's own token, so no scope
 * context need cross the package boundary.
 */
const sameFileVariableType = (
  name: string,
  line: number,
  column: number,
  symbolTable: SymbolTable,
): string | null => {
  const symbol = symbolTable.resolveVariableAtPosition(name, line, column);

  if (
    symbol &&
    (symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Property)
  ) {
    const variable = symbol as VariableSymbol;
    return variable.type?.name ?? null;
  }
  return null;
};

/**
 * Look up a same-file method by name and argument count and return its declared
 * return type name verbatim (casing preserved), or `null` when it cannot be
 * resolved unambiguously.
 *
 * Overloads are disambiguated by ARITY: among same-named methods, only those
 * whose declared parameter count matches `argCount` are considered. A flat
 * first-match-by-name scan (ignoring arguments) picks the first-declared
 * overload regardless of the call — e.g. resolving `describe(5)` to a zero-arg
 * `String describe()` when an `Integer describe(Integer)` is the real target —
 * emitting a wrong declared type. When arity still leaves more than one
 * candidate (or none matches), we bail to `null` rather than guess, so the
 * caller falls back to the safe `Object` placeholder.
 */
const sameFileMethodReturnType = (
  name: string,
  argCount: number,
  symbolTable: SymbolTable,
): string | null => {
  const methods = symbolTable
    .getAllSymbols()
    .filter(
      (candidate): candidate is MethodSymbol =>
        candidate.name?.toLowerCase() === name.toLowerCase() &&
        candidate.kind === SymbolKind.Method,
    );

  if (methods.length === 0) {
    return null;
  }

  // Single same-named method: no overloading, resolve directly.
  if (methods.length === 1) {
    return methods[0].returnType?.name ?? null;
  }

  // Overloaded: keep only arity-compatible candidates. Bail on ambiguity so we
  // never emit a confidently-wrong return type.
  const byArity = methods.filter(
    (method) => (method.parameters?.length ?? 0) === argCount,
  );
  if (byArity.length !== 1) {
    return null;
  }
  return byArity[0].returnType?.name ?? null;
};

/**
 * Resolve the type of a leaf expression — one whose type comes directly from a
 * declaration or literal rather than from combining operand types. Returns the
 * correctly-cased Apex type name, or `null` when it cannot be resolved from the
 * available (same-file, plus optional cross-file seam) information.
 *
 * Handles: `new T(...)`, casts `(T) x`, literals, same-file variable/parameter/
 * field references, and same-file (unqualified) method-call return types.
 * Qualified/chained access (`a.b`, `a.b()`) is deferred to the cross-file seam
 * and yields `null` today (caller falls back to `Object`).
 */
const inferLeafType = (
  expr: ExpressionContext,
  symbolTable: SymbolTable,
  options: InferExpressionTypeOptions,
): string | null => {
  // `new T(...)` — the constructed type is the declared type.
  if (expr instanceof NewExpressionContext) {
    const createdName = expr.creator()?.createdName()?.getText();
    return createdName ? canonicalizeTypeName(createdName) : null;
  }

  // `(T) x` — a cast's static type is the target type, verbatim.
  if (expr instanceof CastExpressionContext) {
    const typeName = expr.typeRef()?.getText();
    return typeName ? canonicalizeTypeName(typeName) : null;
  }

  // Primary expressions: literals and bare identifiers.
  if (expr instanceof PrimaryExpressionContext) {
    const primary = expr.primary();
    if (primary instanceof LiteralPrimaryContext) {
      return inferLiteralType(primary);
    }
    if (primary instanceof IdPrimaryContext) {
      const idNode = primary.id();
      const name = idNode?.getText();
      if (!name) {
        return null;
      }
      // Resolve the reference at its own source position so a same-named local
      // in a sibling scope can't be picked. ANTLR lines are 1-based, columns
      // 0-based — the shape `resolveVariableAtPosition` expects.
      const token = idNode.start;
      const localType = token
        ? sameFileVariableType(name, token.line, token.column, symbolTable)
        : null;
      if (localType) {
        return canonicalizeTypeName(localType);
      }
      // Unresolved locally — offer the cross-file seam (same-file-backed today).
      return options.lookupCrossFileType?.(name) ?? null;
    }
  }

  // Unqualified method call `foo(...)` — resolve the declared return type,
  // disambiguating overloads by argument count.
  if (expr instanceof MethodCallExpressionContext) {
    const methodCall = expr.methodCall();
    const name = methodCall?.id()?.getText();
    if (!name) {
      return null;
    }
    const argCount =
      methodCall?.expressionList()?.expression_list()?.length ?? 0;
    const localReturn = sameFileMethodReturnType(name, argCount, symbolTable);
    if (localReturn) {
      return canonicalizeTypeName(localReturn);
    }
    return options.lookupCrossFileType?.(name) ?? null;
  }

  return null;
};

/**
 * True when `expr` is a leaf whose type this module resolves directly (with
 * casing preserved), rather than delegating to the shared recursive resolver.
 */
const isLeafExpression = (expr: ExpressionContext): boolean =>
  expr instanceof NewExpressionContext ||
  expr instanceof CastExpressionContext ||
  expr instanceof MethodCallExpressionContext ||
  (expr instanceof PrimaryExpressionContext &&
    (expr.primary() instanceof LiteralPrimaryContext ||
      expr.primary() instanceof IdPrimaryContext));

/**
 * Build the `literalTypes` map the shared recursive resolver needs, by walking
 * the subtree rooted at `expr` and classifying each literal primary against its
 * enclosing {@link ExpressionContext}. The resolver treats leaf literals as
 * untyped unless they appear in this map, so composite expressions such as
 * `1 + 2 * 3` cannot resolve without it.
 */
const collectLiteralTypes = (
  expr: ExpressionContext,
): Map<
  ExpressionContext,
  'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
> => {
  const literalTypes = new Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >();

  const visit = (node: any): void => {
    if (node instanceof LiteralPrimaryContext) {
      const literal = node.literal();
      let type:
        'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null' | null =
        null;
      if (literal) {
        if (literal.IntegerLiteral()) {
          type = 'integer';
        } else if (literal.LongLiteral()) {
          type = 'long';
        } else if (literal.NumberLiteral()) {
          type = 'decimal';
        } else if (
          literal.StringLiteral() ||
          literal.MultilineStringLiteral()
        ) {
          type = 'string';
        } else if (literal.BooleanLiteral()) {
          type = 'boolean';
        } else if (literal.NULL?.()) {
          type = 'null';
        }
      }
      if (type) {
        // Key by the nearest enclosing ExpressionContext, matching the
        // convention the validators use to populate this map.
        let parent: any = node.parentCtx;
        while (parent && !(parent instanceof ExpressionContext)) {
          parent = parent.parentCtx;
        }
        if (parent instanceof ExpressionContext) {
          literalTypes.set(parent, type);
        }
      }
    }

    const childCount =
      typeof node?.getChildCount === 'function' ? node.getChildCount() : 0;
    for (let i = 0; i < childCount; i++) {
      const child = node.getChild(i);
      if (child && typeof child.getChildCount === 'function') {
        visit(child);
      }
    }
  };

  visit(expr);
  return literalTypes;
};

/**
 * Pre-seed the recursive resolver's `resolvedTypes` cache with SCOPE-CORRECT
 * variable types, keyed by each bare-identifier {@link PrimaryExpressionContext}
 * in the subtree rooted at `expr`.
 *
 * The recursive resolver consults this cache before its own resolution, and its
 * built-in variable lookup ({@code resolveExpressionTypeTier1}) is a flat,
 * file-wide first-match-by-name scan — the same scope-unaware bug fixed on the
 * leaf path, but reachable here for COMPOSITE expressions (e.g. `x + 1`, where a
 * same-named local in a sibling method would otherwise be picked). Seeding each
 * variable reference with its position-resolved declared type forecloses that:
 * the resolver finds our correct entry and never runs its flat scan for these
 * nodes. Types are stored verbatim (the resolver's combination logic is
 * case-insensitive; final casing is recovered by {@link recoverTypeCasing}).
 */
const collectVariableTypes = (
  expr: ExpressionContext,
  symbolTable: SymbolTable,
): WeakMap<ExpressionContext, ExpressionTypeInfo> => {
  const resolvedTypes = new WeakMap<ExpressionContext, ExpressionTypeInfo>();

  const visit = (node: any): void => {
    if (
      node instanceof PrimaryExpressionContext &&
      node.primary() instanceof IdPrimaryContext
    ) {
      const idNode = (node.primary() as IdPrimaryContext).id();
      const name = idNode?.getText();
      const token = idNode?.start;
      if (name && token) {
        const declaredType = sameFileVariableType(
          name,
          token.line,
          token.column,
          symbolTable,
        );
        if (declaredType) {
          resolvedTypes.set(node, {
            resolvedType: declaredType,
            source: 'variable',
          });
        }
      }
    }

    const childCount =
      typeof node?.getChildCount === 'function' ? node.getChildCount() : 0;
    for (let i = 0; i < childCount; i++) {
      const child = node.getChild(i);
      if (child && typeof child.getChildCount === 'function') {
        visit(child);
      }
    }
  };

  visit(expr);
  return resolvedTypes;
};

/**
 * Infer the Apex type of `expression`, returning the correctly-cased type name
 * (e.g. `Integer`, `String`, `Account`) or `null` when it cannot be resolved.
 *
 * Leaf cases (literals, `new T`, casts, same-file variable/parameter/field
 * references, unqualified same-file method-call return types) are resolved
 * directly here so their casing is preserved. Composite cases (arithmetic,
 * comparison, logical, ternary, unary, `instanceof`) are delegated to the
 * shared {@link resolveExpressionTypeRecursive}, whose lowercased primitive
 * result is normalized back to canonical Apex casing.
 *
 * Same-file only in the first cut; cross-file resolution enters through the
 * optional {@link InferExpressionTypeOptions.lookupCrossFileType} seam. Never
 * throws — resolution failures degrade to `null` so the caller can fall back to
 * `Object`.
 */
export const inferExpressionType = (
  expression: ExpressionContext | null | undefined,
  symbolTable: SymbolTable | null | undefined,
  options: InferExpressionTypeOptions = {},
): string | null => {
  if (!expression || !symbolTable) {
    return null;
  }

  try {
    const expr = unwrapSubExpression(expression);

    // Leaf types are resolved directly to preserve user-defined casing (the
    // shared resolver would lowercase e.g. `Account` to `account`).
    if (isLeafExpression(expr)) {
      return inferLeafType(expr, symbolTable, options);
    }

    // Composite expressions: delegate to the shared recursive resolver, which
    // computes numeric promotion / string concat / comparison-to-Boolean, etc.
    // Its result is always a primitive (lowercased); normalize the casing.
    //
    // Pre-seed the resolver's cache with scope-correct variable types so its own
    // flat, scope-unaware variable lookup never runs for our identifiers — a
    // same-named local in a sibling method must not leak into e.g. `x + 1`.
    const literalTypes = collectLiteralTypes(expr);
    const resolvedTypes = collectVariableTypes(expr, symbolTable);
    const resolved: ExpressionTypeInfo | null = Effect.runSync(
      resolveExpressionTypeRecursive(
        expr,
        resolvedTypes,
        literalTypes,
        symbolTable,
      ),
    );
    if (resolved?.resolvedType) {
      // The recursive resolver lowercases everything. Primitives map through the
      // fixed canonical table; user-defined types (e.g. a ternary/arithmetic
      // over `Account`) have their author casing recovered from the same-file
      // declarations so the emitted declaration reads `Account`, not `account`.
      return recoverTypeCasing(resolved.resolvedType, symbolTable);
    }
    return null;
  } catch {
    // Resilient: any resolution failure degrades to "unknown" (caller falls
    // back to `Object`), never an exception.
    return null;
  }
};
