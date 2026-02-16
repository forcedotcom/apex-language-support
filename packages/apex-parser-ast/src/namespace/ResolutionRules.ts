/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol } from '../types/symbol';
import {
  ResolutionRule,
  NamespaceResolutionContext,
  SymbolProvider,
  SymbolProviderWithStandardNamespace,
  ReferenceTypeValue,
  createTypeWithNamespace,
  Namespaces,
} from './NamespaceUtils';

/**
 * NamedScalarOrVoid rule
 * Priority: 1 - Built-in scalar types (String, Integer, etc.)
 */
export const NamedScalarOrVoid: ResolutionRule = {
  name: 'NamedScalarOrVoid',
  priority: 1,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];
    return symbols.findBuiltInType(name);
  },
};

/**
 * TopLevelTypeInSameNamespace rule
 * Priority: 6 - Types in the same namespace
 */
export const TopLevelTypeInSameNamespace: ResolutionRule = {
  name: 'TopLevelTypeInSameNamespace',
  priority: 6,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1 &&
    context.compilationContext.namespace !== null,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];
    const namespace = context.compilationContext.namespace;

    if (!namespace) return null;

    const candidateName = createTypeWithNamespace(namespace, name, {
      includeNamespace: true,
      normalizeCase: true,
      separator: '.', // Match symbol FQN format (namespace.name)
    });
    return symbols.find(
      context.compilationContext.referencingType,
      candidateName,
    );
  },
};

/**
 * BuiltInSystemSchema rule
 * Priority: 7 - Built-in System and Schema types
 */
export const BuiltInSystemSchema: ResolutionRule = {
  name: 'BuiltInSystemSchema',
  priority: 7,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];

    // Check System types
    const systemType = symbols.findBuiltInType(`System.${name}`);
    if (systemType) return systemType;

    // Check Schema types
    const schemaType = symbols.findBuiltInType(`Schema.${name}`);
    if (schemaType) return schemaType;

    return null;
  },
};

/**
 * SObject rule
 * Priority: 8 - SObject types
 */
export const SObject: ResolutionRule = {
  name: 'SObject',
  priority: 8,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];
    return symbols.findSObjectType(name);
  },
};

/**
 * FileBaseSystemNamespace rule
 * Priority: 9 - Implicit System namespace for file-based apex (e.g. System.Test as Test)
 * Jorje: FileBaseSystemNamespace in OnePartTypeNameResolveRules
 */
export const FileBaseSystemNamespace: ResolutionRule = {
  name: 'FileBaseSystemNamespace',
  priority: 9,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];
    return symbols.find(
      context.compilationContext.referencingType,
      `System.${name}`,
    );
  },
};

/**
 * FileBaseSchemaNamespace rule
 * Priority: 10 - Implicit Schema namespace for file-based apex
 * Jorje: FileBaseSchemaNamespace in OnePartTypeNameResolveRules
 */
export const FileBaseSchemaNamespace: ResolutionRule = {
  name: 'FileBaseSchemaNamespace',
  priority: 10,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];
    return symbols.find(
      context.compilationContext.referencingType,
      `Schema.${name}`,
    );
  },
};

/**
 * BuiltInMethodNamespace rule
 * Priority: 11 - For METHOD context: System, Schema, then other built-in namespaces (Canvas, etc.)
 * Jorje: BuiltInMethodNamespace in OnePartTypeNameResolveRules
 * Only applies when referenceType is METHOD.
 */
export const BuiltInMethodNamespace: ResolutionRule = {
  name: 'BuiltInMethodNamespace',
  priority: 11,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1 &&
    context.referenceType === 'METHOD',
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];
    const refType = context.compilationContext.referencingType;
    // System and Schema already tried by FileBaseSystemNamespace/FileBaseSchemaNamespace.
    // Try other built-in namespaces (Canvas, Database, etc.) if provider supports it.
    if ('findInAnyStandardNamespace' in symbols) {
      return (
        symbols as SymbolProviderWithStandardNamespace
      ).findInAnyStandardNamespace(name, refType);
    }
    return null;
  },
};

/**
 * WorkspaceType rule
 * Priority: 12 - Types from workspace/symbol graph (user classes, etc.)
 * Fallback when no standard namespace matches.
 */
export const WorkspaceType: ResolutionRule = {
  name: 'WorkspaceType',
  priority: 12,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const name = context.adjustedNameParts[0];
    return symbols.find(context.compilationContext.referencingType, name);
  },
};

/**
 * NamespaceAndTopLevelType rule
 * Priority: 4 - Explicit namespace + type name
 */
export const NamespaceAndTopLevelType: ResolutionRule = {
  name: 'NamespaceAndTopLevelType',
  priority: 4,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 2,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const [firstPart, secondPart] = context.adjustedNameParts;

    // Create a proper namespace instance for the first part
    const namespace = Namespaces.create(firstPart);

    const candidateName = createTypeWithNamespace(namespace, secondPart);

    return symbols.find(
      context.compilationContext.referencingType,
      candidateName,
    );
  },
};

/**
 * BuiltInNamespace rule
 * Priority: 5 - Built-in namespace types
 */
export const BuiltInNamespace: ResolutionRule = {
  name: 'BuiltInNamespace',
  priority: 5,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 2,
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const [firstPart, secondPart] = context.adjustedNameParts;

    // Check if first part is a built-in namespace
    if (firstPart === 'system' || firstPart === 'schema') {
      const fullName = `${firstPart}.${secondPart}`;
      return symbols.findBuiltInType(fullName);
    }

    return null;
  },
};

/**
 * SchemaSObject rule
 * Priority: 6 - Schema SObject types
 */
export const SchemaSObject: ResolutionRule = {
  name: 'SchemaSObject',
  priority: 6,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 2 &&
    context.adjustedNameParts[0] === 'schema',
  resolve: (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): ApexSymbol | null => {
    const [, secondPart] = context.adjustedNameParts;
    return symbols.findSObjectType(secondPart);
  },
};

/**
 * One-part rules for METHOD context (method calls).
 * Jorje order: TopLevelTypeInSameNamespace, NamedScalarOrVoid,
 * FileBaseSystemNamespace, FileBaseSchemaNamespace, BuiltInMethodNamespace, SObject
 */
const METHOD_ONE_PART_ORDER = [
  TopLevelTypeInSameNamespace,
  NamedScalarOrVoid,
  BuiltInSystemSchema,
  FileBaseSystemNamespace,
  FileBaseSchemaNamespace,
  BuiltInMethodNamespace,
  SObject,
  WorkspaceType,
];

/**
 * One-part rules for DEFAULT/other contexts (type declarations, etc.)
 */
const DEFAULT_ONE_PART_ORDER = [
  NamedScalarOrVoid,
  TopLevelTypeInSameNamespace,
  BuiltInSystemSchema,
  SObject,
  FileBaseSystemNamespace,
  FileBaseSchemaNamespace,
  WorkspaceType,
];

/**
 * Get all one-part resolution rules in priority order
 */
export const getOnePartRules = (): ResolutionRule[] =>
  [
    NamedScalarOrVoid,
    TopLevelTypeInSameNamespace,
    BuiltInSystemSchema,
    SObject,
    FileBaseSystemNamespace,
    FileBaseSchemaNamespace,
    BuiltInMethodNamespace,
    WorkspaceType,
  ].sort((a, b) => a.priority - b.priority);

/**
 * Get all two-part resolution rules in priority order
 */
export const getTwoPartRules = (): ResolutionRule[] =>
  [NamespaceAndTopLevelType, BuiltInNamespace, SchemaSObject].sort(
    (a, b) => a.priority - b.priority,
  );

/**
 * Get resolution order based on reference type.
 * METHOD: Jorje-style order for method calls (Test.setMock() -> System.Test).
 * DEFAULT/other: Original order.
 */
export const getResolutionOrder = (
  referenceType: ReferenceTypeValue,
): ResolutionRule[] => {
  const onePartRules =
    referenceType === 'METHOD' ? METHOD_ONE_PART_ORDER : DEFAULT_ONE_PART_ORDER;
  return [...onePartRules, ...getTwoPartRules()];
};
