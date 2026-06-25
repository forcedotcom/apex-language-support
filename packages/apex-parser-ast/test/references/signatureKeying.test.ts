/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Signature-key foundations for overload-aware reference separation
 * (W-23133640 — F11-1 + F11-2 schema slice).
 *
 * F11-1 (generic-overload collapse): the shared signature comparison must key
 * on each parameter's `originalTypeString`, NOT its erased `type.name`, so a
 * generic instantiation like `List<String>` is not collapsed to `List` and
 * confused with `List<Integer>`. These tests lock that behavior in
 * `areMethodSignaturesIdentical` (the canonical signature comparator) so a
 * future signature-keyed `findReferencesTo` builds on a proven base.
 *
 * F11-2 (per-overload reference separation, schema slice): `SymbolReference`
 * gained an optional `argumentTypes` field — the call-site signature key a
 * signature-aware reverse index needs. These tests verify the field flows
 * through the method-call factory and survives JSON serialization (so it
 * round-trips across the worker boundary like every other reference field).
 */

import {
  ReferenceContext,
  SymbolReferenceFactory,
  EnhancedSymbolReference,
} from '../../src/types/symbolReference';
import { SymbolKind } from '../../src/types/symbol';
import {
  createPrimitiveType,
  createCollectionType,
  createArrayType,
} from '../../src/types/typeInfo';
import { areMethodSignaturesIdentical } from '../../src/semantics/validation/utils/methodSignatureUtils';
import { ValidationTier } from '../../src/semantics/validation/ValidationTier';

const LOCATION = {
  symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 },
  identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 },
};

/**
 * Minimal MethodSymbol stand-in: `areMethodSignaturesIdentical` only reads
 * `kind` (via isMethodSymbol), `name`, and `parameters[].type`.
 */
function method(
  name: string,
  paramTypes: ReturnType<typeof createPrimitiveType>[],
) {
  return {
    kind: SymbolKind.Method,
    name,
    parameters: paramTypes.map((type, i) => ({ name: `p${i}`, type })),
  } as never;
}

describe('signature keying — F11-1 generic/varargs (areMethodSignaturesIdentical)', () => {
  it('treats List<String> and List<Integer> as DISTINCT signatures (no generic collapse)', () => {
    const listOfString = method('f', [
      createCollectionType('List', [createPrimitiveType('String')]),
    ]);
    const listOfInteger = method('f', [
      createCollectionType('List', [createPrimitiveType('Integer')]),
    ]);

    // Erased name is `List` for both; originalTypeString is `List<String>` vs
    // `List<Integer>`. The comparator must use originalTypeString and report
    // them as different signatures.
    expect(
      areMethodSignaturesIdentical(
        listOfString,
        listOfInteger,
        ValidationTier.IMMEDIATE,
      ),
    ).toBe(false);
  });

  it('treats two List<String> overloads as the SAME signature', () => {
    const a = method('f', [
      createCollectionType('List', [createPrimitiveType('String')]),
    ]);
    const b = method('f', [
      createCollectionType('List', [createPrimitiveType('String')]),
    ]);

    expect(areMethodSignaturesIdentical(a, b, ValidationTier.IMMEDIATE)).toBe(
      true,
    );
  });

  it('distinguishes a scalar param from an array (varargs-style) param', () => {
    const scalar = method('f', [createPrimitiveType('String')]);
    const array = method('f', [createArrayType(createPrimitiveType('String'))]);

    // originalTypeString is `String` vs `String[]`.
    expect(
      areMethodSignaturesIdentical(scalar, array, ValidationTier.IMMEDIATE),
    ).toBe(false);
  });

  it('distinguishes overloads that differ only in parameter arity', () => {
    const one = method('f', [createPrimitiveType('String')]);
    const two = method('f', [
      createPrimitiveType('String'),
      createPrimitiveType('Integer'),
    ]);

    expect(
      areMethodSignaturesIdentical(one, two, ValidationTier.IMMEDIATE),
    ).toBe(false);
  });
});

describe('signature keying — F11-2 SymbolReference.argumentTypes', () => {
  it('createMethodCallReference carries positional call-site argument types', () => {
    const ref = SymbolReferenceFactory.createMethodCallReference(
      'f',
      LOCATION,
      'caller',
      false,
      ['String', 'List<Integer>'],
    );

    expect(ref.context).toBe(ReferenceContext.METHOD_CALL);
    expect(ref.argumentTypes).toEqual(['String', 'List<Integer>']);
  });

  it('argumentTypes is undefined when not supplied (name-only keying fallback)', () => {
    const ref = SymbolReferenceFactory.createMethodCallReference(
      'f',
      LOCATION,
      'caller',
    );

    // Non-overloaded / statically-unknown call sites keep today's behavior:
    // no signature key, so resolution falls back to name-only.
    expect(ref.argumentTypes).toBeUndefined();
  });

  it('argumentTypes survives JSON serialization (round-trips across the worker boundary)', () => {
    const ref = new EnhancedSymbolReference(
      'f',
      LOCATION,
      ReferenceContext.METHOD_CALL,
      undefined,
      'caller',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      ['String', 'List<Integer>'],
    );

    const wire = JSON.parse(JSON.stringify(ref));
    expect(wire.argumentTypes).toEqual(['String', 'List<Integer>']);
  });
});
