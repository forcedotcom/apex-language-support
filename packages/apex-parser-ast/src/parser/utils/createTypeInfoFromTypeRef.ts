/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  TypeNameContext,
  TypeRefContext,
} from '@apexdevtools/apex-parser';
import type { TypeInfo } from '../../types/typeInfo';
import {
  createArrayTypeInfo,
  createCollectionTypeInfo,
  createMapTypeInfo,
  createTypeInfo,
} from '../../utils/TypeInfoFactory';

const typeNamePart = (typeName: TypeNameContext): string | null => {
  if (typeName.LIST()) return 'List';
  if (typeName.SET()) return 'Set';
  if (typeName.MAP()) return 'Map';
  return typeName.id()?.getText() ?? null;
};

/** Build TypeInfo exclusively from grammar-selected type components. */
export function createTypeInfoFromTypeRef(typeRef: TypeRefContext): TypeInfo {
  const typeNames = typeRef.typeName_list() ?? [];
  const parts = typeNames
    .map(typeNamePart)
    .filter((part): part is string => part !== null);
  if (parts.length === 0) return createTypeInfo('Object');

  const qualifiedName = parts.join('.');
  const genericOwner = typeNames.find((typeName) => typeName.typeArguments());
  const typeParameters =
    genericOwner
      ?.typeArguments()
      ?.typeList()
      ?.typeRef_list()
      .map(createTypeInfoFromTypeRef) ?? [];
  const collectionName = parts[parts.length - 1];

  let result: TypeInfo;
  if (collectionName === 'Map' && typeParameters.length >= 2) {
    result = createMapTypeInfo(typeParameters[0], typeParameters[1]);
  } else if (
    (collectionName === 'List' || collectionName === 'Set') &&
    typeParameters.length > 0
  ) {
    result = createCollectionTypeInfo(collectionName, typeParameters);
  } else if (typeParameters.length > 0) {
    const base = createTypeInfo(qualifiedName);
    result = {
      ...base,
      typeParameters,
      originalTypeString: `${qualifiedName}<${typeParameters
        .map((parameter) => parameter.originalTypeString)
        .join(', ')}>`,
    };
  } else {
    result = createTypeInfo(qualifiedName);
  }

  const dimensions = typeRef.arraySubscripts()?.LBRACK_list().length ?? 0;
  for (let dimension = 0; dimension < dimensions; dimension++) {
    result = createArrayTypeInfo(result);
  }
  return result;
}
