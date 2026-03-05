/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TypeRefContext } from '@apexdevtools/apex-parser';
import type { TypeInfo } from '../../types/typeInfo';
import { createPrimitiveType } from '../../types/typeInfo';
import {
  createTypeInfo,
  createCollectionTypeInfo,
  createMapTypeInfo,
} from '../../utils/TypeInfoFactory';

type GetTextFn = (ctx: { text?: string }) => string;

const defaultGetText: GetTextFn = (ctx) => ctx?.text || '';

/**
 * Extract TypeInfo from TypeRefContext using parser structure.
 * Provides accurate type information including typeParameters and keyType for Map/List/Set.
 *
 * @param typeRef The TypeRefContext to extract type info from
 * @param getText Optional function to get text from context (defaults to ctx.text)
 * @returns TypeInfo object with proper structure including typeParameters
 */
export function createTypeInfoFromTypeRef(
  typeRef: TypeRefContext,
  getText: GetTextFn = defaultGetText,
): TypeInfo {
  const typeNames = typeRef.typeName();
  if (!typeNames || typeNames.length === 0) {
    return createTypeInfo('Object');
  }

  const baseTypeName = typeNames[0];
  if (!baseTypeName) {
    return createTypeInfo('Object');
  }

  const listToken = baseTypeName.LIST();
  const setToken = baseTypeName.SET();
  const mapToken = baseTypeName.MAP();

  const typeArguments = baseTypeName.typeArguments();
  const typeList = typeArguments?.typeList();
  const genericTypeRefs = typeList?.typeRef() || [];

  let baseTypeNameStr: string;
  if (listToken) {
    baseTypeNameStr = 'List';
  } else if (setToken) {
    baseTypeNameStr = 'Set';
  } else if (mapToken) {
    baseTypeNameStr = 'Map';
  } else {
    const id = baseTypeName.id();
    if (!id) {
      const typeRefText = typeRef.text?.toLowerCase().trim();
      if (typeRefText === 'void') {
        return createPrimitiveType('void');
      }
      const typeNameText = (baseTypeName as { text?: string }).text
        ?.toLowerCase()
        ?.trim();
      if (typeNameText === 'void') {
        return createPrimitiveType('void');
      }
      return createTypeInfo('Object');
    }
    baseTypeNameStr = id.text;
  }

  // Handle qualified type names (e.g., System.Url)
  if (typeNames.length > 1) {
    const qualifiedParts = typeNames.map((tn) => {
      const tnId = tn.id();
      if (tnId) {
        return tnId.text;
      }
      return `${tn.LIST() || tn.SET() || tn.MAP()}`;
    });
    const qualifiedName = qualifiedParts.join('.');
    return createTypeInfo(
      typeArguments
        ? `${qualifiedName}<${genericTypeRefs.map((tr) => getText(tr)).join(', ')}>`
        : qualifiedName,
    );
  }

  // Handle generic type parameters
  if (genericTypeRefs.length > 0) {
    const typeParameters = genericTypeRefs.map((tr) =>
      createTypeInfoFromTypeRef(tr, getText),
    );

    if (mapToken && typeParameters.length >= 2) {
      return createMapTypeInfo(typeParameters[0], typeParameters[1]);
    }

    if (listToken || setToken) {
      return createCollectionTypeInfo(baseTypeNameStr, typeParameters);
    }

    // Regular types with generics
    const baseTypeInfo = createTypeInfo(baseTypeNameStr);
    return {
      ...baseTypeInfo,
      typeParameters,
      originalTypeString: `${baseTypeNameStr}<${typeParameters.map((tp) => tp.originalTypeString).join(', ')}>`,
    };
  }

  // Array subscripts - fall back to string parsing
  const arraySubscripts = typeRef.arraySubscripts();
  if (arraySubscripts) {
    return createTypeInfo(getText(typeRef));
  }

  return createTypeInfo(baseTypeNameStr);
}
