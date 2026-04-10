/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MethodSymbol, VariableSymbol } from '../types/symbol';
import type { TypeInfo } from '../types/typeInfo';

export type GenericTypeSubstitutionMap = Map<string, string>;

export function createGenericTypeSubstitutionMap(
  receiverType: TypeInfo | undefined,
): GenericTypeSubstitutionMap | null {
  if (!receiverType) {
    return null;
  }
  const baseTypeName = receiverType.name?.toLowerCase();
  if (!baseTypeName) {
    return null;
  }

  const substitutions = new Map<string, string>();
  if (baseTypeName === 'map') {
    const keyType = receiverType.keyType?.name;
    const valueType = receiverType.typeParameters?.[0]?.name;
    if (keyType && valueType) {
      substitutions.set('K', keyType);
      substitutions.set('V', valueType);
    }
  } else if (baseTypeName === 'list' || baseTypeName === 'set') {
    const elementType = receiverType.typeParameters?.[0]?.name;
    if (elementType) {
      substitutions.set('T', elementType);
    }
  }

  return substitutions.size > 0 ? substitutions : null;
}

export function substituteTypeName(
  typeName: string | undefined,
  substitutions: GenericTypeSubstitutionMap | null | undefined,
): string | undefined {
  if (!typeName || !substitutions || substitutions.size === 0) {
    return typeName;
  }
  if (typeName.length === 1 && substitutions.has(typeName)) {
    return substitutions.get(typeName);
  }
  return typeName;
}

export function applyTypeSubstitutions(
  typeInfo: TypeInfo,
  substitutions: GenericTypeSubstitutionMap | null | undefined,
): TypeInfo {
  if (!substitutions || substitutions.size === 0) {
    return typeInfo;
  }
  const substitutedName = substituteTypeName(typeInfo.name, substitutions);
  const substitutedOriginal =
    substituteTypeName(typeInfo.originalTypeString, substitutions) ??
    typeInfo.originalTypeString;
  return {
    ...typeInfo,
    name: substitutedName ?? typeInfo.name,
    originalTypeString: substitutedOriginal,
    keyType: typeInfo.keyType
      ? applyTypeSubstitutions(typeInfo.keyType, substitutions)
      : typeInfo.keyType,
    typeParameters: typeInfo.typeParameters?.map((tp) =>
      applyTypeSubstitutions(tp, substitutions),
    ),
  };
}

export function applyMethodTypeSubstitutions(
  methodSymbol: MethodSymbol,
  substitutions: GenericTypeSubstitutionMap | null | undefined,
): MethodSymbol {
  if (!substitutions || substitutions.size === 0) {
    return methodSymbol;
  }
  const updatedParameters = methodSymbol.parameters.map((param) => {
    const typedParam = param as VariableSymbol;
    return {
      ...typedParam,
      type: applyTypeSubstitutions(typedParam.type, substitutions),
    };
  });
  return {
    ...methodSymbol,
    returnType: applyTypeSubstitutions(methodSymbol.returnType, substitutions),
    parameters: updatedParameters,
  };
}
