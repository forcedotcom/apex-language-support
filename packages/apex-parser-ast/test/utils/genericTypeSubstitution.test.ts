/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createCollectionType,
  createMapType,
  createPrimitiveType,
} from '../../src/types/typeInfo';
import {
  applyMethodTypeSubstitutions,
  createGenericTypeSubstitutionMap,
  substituteTypeName,
} from '../../src/utils/genericTypeSubstitution';
import { SymbolKind, type MethodSymbol } from '../../src/types/symbol';

describe('genericTypeSubstitution', () => {
  it('creates substitution map for List<T> and Set<T>', () => {
    const listType = createCollectionType('List', [
      createPrimitiveType('String'),
    ]);
    const setType = createCollectionType('Set', [
      createPrimitiveType('Integer'),
    ]);

    expect(createGenericTypeSubstitutionMap(listType)).toEqual(
      new Map([['T', 'String']]),
    );
    expect(createGenericTypeSubstitutionMap(setType)).toEqual(
      new Map([['T', 'Integer']]),
    );
  });

  it('creates substitution map for Map<K,V>', () => {
    const mapType = createMapType(
      createPrimitiveType('String'),
      createPrimitiveType('Decimal'),
    );
    expect(createGenericTypeSubstitutionMap(mapType)).toEqual(
      new Map([
        ['K', 'String'],
        ['V', 'Decimal'],
      ]),
    );
  });

  it('returns null when receiver type has no usable generic substitutions', () => {
    const plainType = createPrimitiveType('String');
    const incompleteMap = createCollectionType('Map', [
      createPrimitiveType('Id'),
    ]);
    expect(createGenericTypeSubstitutionMap(plainType)).toBeNull();
    expect(createGenericTypeSubstitutionMap(incompleteMap)).toBeNull();
  });

  it('substitutes generic parameter names safely', () => {
    const substitutions = new Map([
      ['T', 'Coordinates'],
      ['K', 'String'],
      ['V', 'Integer'],
    ]);
    expect(substituteTypeName('T', substitutions)).toBe('Coordinates');
    expect(substituteTypeName('K', substitutions)).toBe('String');
    expect(substituteTypeName('V', substitutions)).toBe('Integer');
    expect(substituteTypeName('List', substitutions)).toBe('List');
  });

  it('applies substitutions to method signature types', () => {
    const method = {
      kind: SymbolKind.Method,
      name: 'put',
      returnType: createPrimitiveType('V'),
      parameters: [
        { type: createPrimitiveType('K') },
        { type: createPrimitiveType('V') },
      ],
    } as unknown as MethodSymbol;
    const substitutions = new Map([
      ['K', 'String'],
      ['V', 'Integer'],
    ]);

    const substituted = applyMethodTypeSubstitutions(method, substitutions);
    expect(substituted.returnType.name).toBe('Integer');
    expect(substituted.parameters[0]?.type.name).toBe('String');
    expect(substituted.parameters[1]?.type.name).toBe('Integer');
  });

  it('leaves method signature unchanged without substitutions', () => {
    const method = {
      kind: SymbolKind.Method,
      name: 'add',
      returnType: createPrimitiveType('Boolean'),
      parameters: [{ type: createPrimitiveType('T') }],
    } as unknown as MethodSymbol;

    const substituted = applyMethodTypeSubstitutions(method, null);
    expect(substituted).toBe(method);
  });
});
