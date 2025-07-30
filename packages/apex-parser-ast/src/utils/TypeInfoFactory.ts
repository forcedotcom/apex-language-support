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
import { BUILT_IN_NAMESPACES } from '../generated/builtInNamespaces';
import { getLogger } from '@salesforce/apex-lsp-shared';

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

  // Check if it's a built-in type that we can resolve immediately
  const builtInSymbol = builtInTypes.findType(typeName.toLowerCase());
  if (builtInSymbol) {
    logger.debug(() => `Found built-in type: ${typeName}`);
    return {
      name: typeName,
      isArray: false,
      isCollection: false,
      isPrimitive: isPrimitiveType(typeName),
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
  // Check if it's a known built-in namespace
  if (BUILT_IN_NAMESPACES.includes(namespace as any)) {
    // For namespaces that have predefined constants, use those
    switch (namespace) {
      case 'System':
        return Namespaces.SYSTEM;
      case 'Schema':
        return Namespaces.SCHEMA;
      case 'Apex':
        return Namespaces.APEX;
      case 'ApexPages':
        return Namespaces.APEX_PAGES;
      case 'Database':
        return Namespaces.DATABASE;
      case 'Flow':
        return Namespaces.FLOW;
      case 'ConnectApi':
        return Namespaces.CONNECT_API;
      case 'CustomMetadata':
        return Namespaces.CUSTOM_METADATA;
      case 'Messaging':
        return Namespaces.MESSAGING;
      case 'Component':
        return Namespaces.VF_COMPONENT;
      case 'c':
        return Namespaces.VF;
      default:
        // For other built-in namespaces, create a new namespace instance
        return new Namespace(namespace, '');
    }
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
