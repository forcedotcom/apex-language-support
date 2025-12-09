/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypeInfo } from '../types/typeInfo';
import { Namespace, Namespaces } from '../namespace/NamespaceUtils';
import { BuiltInTypeTablesImpl } from './BuiltInTypeTables';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ResourceLoader } from './resourceLoader';

const logger = getLogger();
const builtInTypes = BuiltInTypeTablesImpl.getInstance();

/**
 * Create a TypeInfo object from a type string with comprehensive namespace resolution
 * @param typeString The type string to parse
 * @returns TypeInfo object with appropriate namespace information
 */
export const createTypeInfo = (typeString: string): TypeInfo => {
  logger.debug(
    () => `TypeInfoFactory.createTypeInfo called with: ${typeString}`,
  );

  // Handle qualified type names (e.g., System.PageReference, MyNamespace.MyClass)
  if (typeString.includes('.')) {
    return createQualifiedTypeInfo(typeString);
  }

  // Handle simple type names
  return createSimpleTypeInfo(typeString);
};

/**
 * Create TypeInfo for qualified type names (e.g., System.String, MyNamespace.MyClass)
 */
const createQualifiedTypeInfo = (typeString: string): TypeInfo => {
  const [namespace, typeName] = typeString.split('.');
  logger.debug(
    () =>
      `Processing qualified type - namespace: ${namespace}, typeName: ${typeName}`,
  );

  // Handle built-in namespaces
  const builtInNamespace = getBuiltInNamespace(namespace);
  if (builtInNamespace) {
    logger.debug(() => `Using built-in namespace: ${namespace}`);
    return {
      name: typeName,
      isArray: false,
      isCollection: false,
      isPrimitive: false,
      namespace: builtInNamespace,
      originalTypeString: typeString,
      getNamespace: () => builtInNamespace,
    };
  }

  // For custom namespaces, create a new namespace instance
  logger.debug(() => `Creating custom namespace: ${namespace}`);
  const customNamespace = new Namespace(namespace, '');
  return {
    name: typeName,
    isArray: false,
    isCollection: false,
    isPrimitive: false,
    namespace: customNamespace,
    originalTypeString: typeString,
    getNamespace: () => customNamespace,
  };
};

/**
 * Create TypeInfo for simple type names (e.g., String, Account, MyClass)
 */
const createSimpleTypeInfo = (typeName: string): TypeInfo => {
  logger.debug(() => `Processing simple type: ${typeName}`);

  // Check if it's a primitive/wrapper type first (these are now in ResourceLoader, not BuiltInTypeTables)
  if (isPrimitiveType(typeName)) {
    logger.debug(() => `Found primitive type: ${typeName}`);
    return {
      name: typeName,
      isArray: false,
      isCollection: false,
      isPrimitive: true,
      originalTypeString: typeName,
      getNamespace: () => null, // Primitive types don't have namespaces
    };
  }

  // Check if it's a built-in type in BuiltInTypeTables (scalar types like void, null, or SObjects)
  const builtInSymbol = builtInTypes.findType(typeName.toLowerCase());
  if (builtInSymbol) {
    logger.debug(() => `Found built-in type: ${typeName}`);
    return {
      name: typeName,
      isArray: false,
      isCollection: false,
      isPrimitive: isPrimitiveType(typeName), // void and null are primitives
      originalTypeString: typeName,
      getNamespace: () => null, // Built-in types don't have namespaces
    };
  }

  // For user-defined types, we need namespace resolution
  logger.debug(() => `User-defined type requiring resolution: ${typeName}`);
  return {
    name: typeName,
    isArray: false,
    isCollection: false,
    isPrimitive: false,
    originalTypeString: typeName,
    needsNamespaceResolution: true, // Mark for later resolution
    getNamespace: () => null, // Will be resolved later
  };
};

/**
 * Get built-in namespace for known namespaces
 */
const getBuiltInNamespace = (namespace: string): Namespace | null => {
  const resourceLoader = ResourceLoader.getInstance({
    preloadStdClasses: true,
  });
  // Check if it's a known standard Apex namespace
  if (
    [...resourceLoader.getStandardNamespaces().keys()].includes(
      namespace as any,
    )
  ) {
    // For all built-in namespaces, create a new namespace instance
    // The Namespaces class doesn't have predefined constants for these
    return Namespaces.create(namespace);
  }
  return null;
};

/**
 * Check if a type name is a primitive type
 */
const isPrimitiveType = (typeName: string): boolean => {
  const primitiveTypes = [
    'void',
    'null',
    'String',
    'Integer',
    'Long',
    'Double',
    'Decimal',
    'Boolean',
    'Date',
    'DateTime',
    'Time',
    'Blob',
    'Id',
    'Object',
  ];
  return primitiveTypes.includes(typeName);
};

/**
 * Create TypeInfo for array types
 */
export const createArrayTypeInfo = (elementType: TypeInfo): TypeInfo => ({
  name: `${elementType.name}[]`,
  isArray: true,
  isCollection: false,
  isPrimitive: false,
  typeParameters: [elementType],
  originalTypeString: `${elementType.originalTypeString}[]`,
  namespace: elementType.namespace,
  needsNamespaceResolution: elementType.needsNamespaceResolution,
  getNamespace: () => elementType.getNamespace(),
});

/**
 * Create TypeInfo for collection types (List, Set, Map)
 */
export const createCollectionTypeInfo = (
  collectionName: string,
  typeParameters: TypeInfo[] = [],
): TypeInfo => ({
  name: collectionName,
  isArray: false,
  isCollection: true,
  isPrimitive: false,
  typeParameters,
  originalTypeString: buildCollectionTypeString(collectionName, typeParameters),
  getNamespace: () => null, // Collections are built-in types
});

/**
 * Create TypeInfo for Map types
 */
export const createMapTypeInfo = (
  keyType: TypeInfo,
  valueType: TypeInfo,
): TypeInfo => ({
  name: 'Map',
  isArray: false,
  isCollection: true,
  isPrimitive: false,
  keyType,
  typeParameters: [valueType],
  originalTypeString: `Map<${keyType.originalTypeString}, ${valueType.originalTypeString}>`,
  getNamespace: () => null, // Map is a built-in type
});

/**
 * Build type string for collection types with generics
 */
const buildCollectionTypeString = (
  baseName: string,
  typeParameters: TypeInfo[] = [],
): string => {
  if (typeParameters.length === 0) {
    return baseName;
  }

  const typeArgs = typeParameters.map((t) => t.originalTypeString).join(', ');
  return `${baseName}<${typeArgs}>`;
};

/**
 * Check if a TypeInfo needs namespace resolution
 */
export const needsResolution = (typeInfo: TypeInfo): boolean =>
  typeInfo.needsNamespaceResolution === true;

/**
 * Mark a TypeInfo as needing namespace resolution
 */
export const markForResolution = (typeInfo: TypeInfo): TypeInfo => ({
  ...typeInfo,
  needsNamespaceResolution: true,
});
