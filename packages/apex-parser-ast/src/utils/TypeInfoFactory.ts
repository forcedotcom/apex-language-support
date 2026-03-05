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
import { isPrimitiveType } from './primitiveTypes';

const logger = getLogger();
const builtInTypes = BuiltInTypeTablesImpl.getInstance();

/**
 * Extract the base type name from a type string, removing generic type arguments
 * @param typeString The full type string (e.g., "List<Integer>", "Map<String, Object>")
 * @returns The base type name (e.g., "List", "Map")
 */
const extractBaseTypeName = (typeString: string): string => {
  // Find the first '<' which indicates the start of generic type arguments
  const genericStart = typeString.indexOf('<');
  if (genericStart === -1) {
    // No generics, return the full string
    return typeString;
  }

  // Extract everything before the first '<'
  return typeString.substring(0, genericStart).trim();
};

/**
 * Create a TypeInfo object from a type string with comprehensive namespace resolution
 * @param typeString The type string to parse (may include generics like "List<Integer>")
 * @returns TypeInfo object with appropriate namespace information
 */
export const createTypeInfo = (typeString: string): TypeInfo => {
  logger.debug(
    () => `TypeInfoFactory.createTypeInfo called with: ${typeString}`,
  );

  // Extract base type name (without generics) for the name field
  const baseTypeName = extractBaseTypeName(typeString);

  // Handle qualified type names (e.g., System.PageReference, MyNamespace.MyClass)
  // Check the base type name (before generics) for qualified names
  if (baseTypeName.includes('.')) {
    return createQualifiedTypeInfo(typeString, baseTypeName);
  }

  // Handle simple type names
  return createSimpleTypeInfo(typeString, baseTypeName);
};

/**
 * Create TypeInfo for qualified type names (e.g., System.String, MyNamespace.MyClass)
 * @param typeString The full type string (may include generics)
 * @param baseTypeName The base type name without generics
 * (e.g., "System.Url" from "System.Url" or "System.Url" from "List<System.Url>")
 */
const createQualifiedTypeInfo = (
  typeString: string,
  baseTypeName: string,
): TypeInfo => {
  // Split the base type name (without generics) to get namespace and type
  const parts = baseTypeName.split('.');
  const namespace = parts[0];
  const typeName = parts.slice(1).join('.'); // Handle multi-part namespaces

  logger.debug(
    () =>
      `Processing qualified type - namespace: ${namespace}, typeName: ${typeName}`,
  );

  // Handle built-in namespaces
  const builtInNamespace = getBuiltInNamespace(namespace);
  if (builtInNamespace) {
    logger.debug(() => `Using built-in namespace: ${namespace}`);
    return {
      name: typeName, // Just the type name, not the full qualified name
      isArray: false,
      isCollection: false,
      isPrimitive: false,
      isBuiltIn: true, // Types from built-in namespaces (System, Schema, etc.) are built-in
      namespace: builtInNamespace,
      originalTypeString: typeString, // Keep full string with generics if present
      getNamespace: () => builtInNamespace,
    };
  }

  // For custom namespaces, create a new namespace instance
  logger.debug(() => `Creating custom namespace: ${namespace}`);
  const customNamespace = new Namespace(namespace, '');
  return {
    name: typeName, // Just the type name, not the full qualified name
    isArray: false,
    isCollection: false,
    isPrimitive: false,
    namespace: customNamespace,
    originalTypeString: typeString, // Keep full string with generics if present
    getNamespace: () => customNamespace,
  };
};

/**
 * Create TypeInfo for simple type names (e.g., String, Account, MyClass)
 * @param typeString The full type string (may include generics like "List<Integer>")
 * @param baseTypeName The base type name without generics (e.g., "List" from "List<Integer>")
 */
const createSimpleTypeInfo = (
  typeString: string,
  baseTypeName: string,
): TypeInfo => {
  logger.debug(
    () => `Processing simple type: ${baseTypeName} (full: ${typeString})`,
  );

  // Check if it's a primitive/wrapper type first (these are now in ResourceLoader, not BuiltInTypeTables)
  if (isPrimitiveType(baseTypeName)) {
    logger.debug(() => `Found primitive type: ${baseTypeName}`);
    return {
      name: baseTypeName, // Just the base name, not the full generic string
      isArray: false,
      isCollection: false,
      isPrimitive: true,
      isBuiltIn: true, // Primitive types are built-in
      originalTypeString: typeString, // Keep full string with generics if present
      getNamespace: () => null, // Primitive types don't have namespaces
    };
  }

  // Check if it's a built-in type in BuiltInTypeTables (scalar types like void, null, or SObjects)
  const builtInSymbol = builtInTypes.findType(baseTypeName.toLowerCase());
  if (builtInSymbol) {
    logger.debug(() => `Found built-in type: ${baseTypeName}`);
    return {
      name: baseTypeName, // Just the base name, not the full generic string
      isArray: false,
      isCollection: false,
      isPrimitive: isPrimitiveType(baseTypeName), // void and null are primitives
      isBuiltIn: true, // Types from BuiltInTypeTables are built-in
      originalTypeString: typeString, // Keep full string with generics if present
      getNamespace: () => null, // Built-in types don't have namespaces
    };
  }

  // For user-defined types, we need namespace resolution
  logger.debug(() => `User-defined type requiring resolution: ${baseTypeName}`);
  return {
    name: baseTypeName, // Just the base name, not the full generic string
    isArray: false,
    isCollection: false,
    isPrimitive: false,
    originalTypeString: typeString, // Keep full string with generics if present
    needsNamespaceResolution: true, // Mark for later resolution
    getNamespace: () => null, // Will be resolved later
  };
};

/**
 * Get built-in namespace for known namespaces
 */
const getBuiltInNamespace = (namespace: string): Namespace | null => {
  const resourceLoader = ResourceLoader.getInstance();
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

export { isPrimitiveType, isNonNullablePrimitiveType } from './primitiveTypes';
export { APEX_PRIMITIVE_TYPES_ARRAY as PRIMITIVE_TYPES } from './primitiveTypes';

/**
 * Create TypeInfo for array types
 */
export const createArrayTypeInfo = (elementType: TypeInfo): TypeInfo => ({
  name: `${elementType.name}[]`,
  isArray: true,
  isCollection: false,
  isPrimitive: false,
  isBuiltIn: elementType.isBuiltIn, // Arrays of built-in types are also built-in
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
  isBuiltIn: true, // List, Set, Map are built-in types
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
  isBuiltIn: true, // Map is a built-in type
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
