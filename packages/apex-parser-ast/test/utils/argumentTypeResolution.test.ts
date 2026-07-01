/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unit tests for the pure argument-type resolution utility (W-23182862,
 * Phase B). These cover literal classification, identifier lookup delegation,
 * and the all-or-nothing contract that keeps same-arity overloads unified when
 * any argument is unresolvable.
 */

import {
  literalTypeOfExpression,
  isBareIdentifier,
  resolveArgumentType,
  resolveArgumentTypes,
} from '../../src/utils/argumentTypeResolution';

describe('literalTypeOfExpression', () => {
  it('classifies string literals (single-quoted)', () => {
    expect(literalTypeOfExpression("'hi'")).toBe('String');
    expect(literalTypeOfExpression("''")).toBe('String');
  });

  it('classifies boolean and null literals', () => {
    expect(literalTypeOfExpression('true')).toBe('Boolean');
    expect(literalTypeOfExpression('false')).toBe('Boolean');
    expect(literalTypeOfExpression('null')).toBe('Null');
  });

  it('classifies numeric literals (Integer / Long / Decimal)', () => {
    expect(literalTypeOfExpression('42')).toBe('Integer');
    expect(literalTypeOfExpression('-7')).toBe('Integer');
    expect(literalTypeOfExpression('42L')).toBe('Long');
    expect(literalTypeOfExpression('10l')).toBe('Long');
    expect(literalTypeOfExpression('3.14')).toBe('Decimal');
    expect(literalTypeOfExpression('.5')).toBe('Decimal');
    expect(literalTypeOfExpression('5.')).toBe('Decimal');
  });

  it('returns undefined for identifiers and non-literal expressions', () => {
    expect(literalTypeOfExpression('x')).toBeUndefined();
    expect(literalTypeOfExpression('foo()')).toBeUndefined();
    expect(literalTypeOfExpression('a.b')).toBeUndefined();
    expect(literalTypeOfExpression('')).toBeUndefined();
  });
});

describe('isBareIdentifier', () => {
  it('accepts simple identifiers', () => {
    expect(isBareIdentifier('x')).toBe(true);
    expect(isBareIdentifier('myVar')).toBe(true);
    expect(isBareIdentifier('_under1')).toBe(true);
  });

  it('rejects literals, chains, calls, and casts', () => {
    expect(isBareIdentifier("'hi'")).toBe(false);
    expect(isBareIdentifier('42')).toBe(false);
    expect(isBareIdentifier('a.b')).toBe(false);
    expect(isBareIdentifier('f()')).toBe(false);
    expect(isBareIdentifier('(String) x')).toBe(false);
  });
});

describe('resolveArgumentType', () => {
  const lookup = (id: string): string | undefined =>
    ({ name: 'String', count: 'Integer' })[id];

  it('resolves a literal without consulting the lookup', () => {
    let consulted = false;
    const spy = (id: string): string | undefined => {
      consulted = true;
      return lookup(id);
    };
    expect(resolveArgumentType("'x'", spy)).toBe('String');
    expect(consulted).toBe(false);
  });

  it('resolves a bare identifier via the lookup', () => {
    expect(resolveArgumentType('name', lookup)).toBe('String');
    expect(resolveArgumentType('count', lookup)).toBe('Integer');
  });

  it('returns undefined for an identifier not in scope', () => {
    expect(resolveArgumentType('missing', lookup)).toBeUndefined();
  });

  it('returns undefined for non-identifier, non-literal expressions', () => {
    expect(resolveArgumentType('f()', lookup)).toBeUndefined();
    expect(resolveArgumentType('a.b', lookup)).toBeUndefined();
  });
});

describe('resolveArgumentTypes (all-or-nothing)', () => {
  const lookup = (id: string): string | undefined =>
    ({ s: 'String', n: 'Integer' })[id];

  it('returns the positional types when every argument resolves', () => {
    expect(resolveArgumentTypes(["'lit'", 's', 'n'], lookup)).toEqual([
      'String',
      'String',
      'Integer',
    ]);
  });

  it('returns [] for a no-argument call', () => {
    expect(resolveArgumentTypes([], lookup)).toEqual([]);
  });

  it('returns undefined if ANY argument is unresolvable (stays unified)', () => {
    expect(resolveArgumentTypes(['s', 'mk()'], lookup)).toBeUndefined();
    expect(resolveArgumentTypes(['unknownVar'], lookup)).toBeUndefined();
  });
});
