/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Semantic resolution of call-site argument source texts to type strings, the
 * second phase of type-aware overload separation (W-23182862).
 *
 * Phase A (parser listeners) captures each argument's raw source text onto the
 * reference as `argumentExpressions`. This module turns those texts into the
 * positional `argumentTypes` signature key used to separate same-arity
 * overloads (`f(String)` vs `f(Integer)`).
 *
 * Scope (deliberate): literal arguments and simple identifier arguments
 * (locals, parameters, fields) only. Anything that would require deeper
 * resolution — method-call results `f(g())`, member chains `f(a.b)`, casts,
 * `new T()` — is intentionally NOT resolved here. When any one argument cannot
 * be typed, the whole call's `argumentTypes` is left undefined so the overload
 * set stays unified: a conservative, correct degradation rather than a wrong
 * split. This is not a fallback papering over a defect — it is the right answer
 * when static type information is genuinely absent at this resolution depth.
 */

/**
 * Type string of a simple Apex literal, or `undefined` if the text is not a
 * literal this resolver recognizes (it may still be an identifier — see
 * {@link resolveArgumentType}).
 *
 * Mirrors the literal kinds the parser records in
 * `SymbolReference.literalType`: String, Boolean, Null, Long, Integer, Decimal.
 * Operates on the trimmed argument source text as captured by `getText()`.
 */
export const literalTypeOfExpression = (text: string): string | undefined => {
  const t = text.trim();
  if (t.length === 0) return undefined;

  // String literal: single-quoted (Apex has no double-quoted strings).
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
    return 'String';
  }
  if (t === 'true' || t === 'false') return 'Boolean';
  if (t === 'null') return 'Null';

  // Numeric literals. Apex: Long has an `l`/`L` suffix; a decimal point (or
  // exponent-free fractional) is Decimal; otherwise an integer literal.
  if (/^-?\d+[lL]$/.test(t)) return 'Long';
  if (/^-?\d+$/.test(t)) return 'Integer';
  if (/^-?\d*\.\d+$/.test(t) || /^-?\d+\.\d*$/.test(t)) return 'Decimal';

  return undefined;
};

/**
 * True when the text is a bare identifier (a candidate local/parameter/field
 * name), as opposed to a literal, a dotted chain, a call, or any other
 * expression. Only bare identifiers are resolved via scope lookup.
 */
export const isBareIdentifier = (text: string): boolean =>
  /^[A-Za-z_]\w*$/.test(text.trim());

/**
 * Resolve a single argument's source text to its type string.
 *
 * 1. Recognized literal → its literal type ({@link literalTypeOfExpression}).
 * 2. Bare identifier → `lookupType(name)`, the declared type of the local /
 *    parameter / field it names (caller supplies the scope-aware lookup).
 * 3. Anything else (or an identifier that does not resolve) → `undefined`.
 *
 * @param text The trimmed argument source text (one entry of
 *   `SymbolReference.argumentExpressions`).
 * @param lookupType Resolves a bare identifier name to its declared type
 *   string, or `undefined` if not found in scope.
 */
export const resolveArgumentType = (
  text: string,
  lookupType: (identifier: string) => string | undefined,
): string | undefined => {
  const literal = literalTypeOfExpression(text);
  if (literal) return literal;

  const t = text.trim();
  if (isBareIdentifier(t)) {
    return lookupType(t);
  }

  return undefined;
};

/**
 * Resolve every argument of a call to its type string, returning the positional
 * `argumentTypes` signature key — or `undefined` if ANY argument cannot be
 * typed (so the call stays name-/arity-keyed and its overload set unified).
 *
 * An empty `argumentExpressions` (a no-arg call `f()`) yields `[]`: a fully
 * known, zero-length signature.
 *
 * @param argumentExpressions Per-argument source texts (Phase A capture).
 * @param lookupType Scope-aware identifier→type resolver (see
 *   {@link resolveArgumentType}).
 */
export const resolveArgumentTypes = (
  argumentExpressions: readonly string[],
  lookupType: (identifier: string) => string | undefined,
): string[] | undefined => {
  const resolved: string[] = [];
  for (const expr of argumentExpressions) {
    const type = resolveArgumentType(expr, lookupType);
    if (type === undefined) {
      return undefined;
    }
    resolved.push(type);
  }
  return resolved;
};
