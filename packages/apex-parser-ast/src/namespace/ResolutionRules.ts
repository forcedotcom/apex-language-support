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

    const candidateName = createTypeWithNamespace(namespace, name);
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
 * Get all one-part resolution rules in priority order
 */
export const getOnePartRules = (): ResolutionRule[] =>
  [
    NamedScalarOrVoid,
    TopLevelTypeInSameNamespace,
    BuiltInSystemSchema,
    SObject,
  ].sort((a, b) => a.priority - b.priority);

/**
 * Get all two-part resolution rules in priority order
 */
export const getTwoPartRules = (): ResolutionRule[] =>
  [NamespaceAndTopLevelType, BuiltInNamespace, SchemaSObject].sort(
    (a, b) => a.priority - b.priority,
  );

/**
 * Get resolution order based on reference type
 */
export const getResolutionOrder = (
  referenceType: ReferenceTypeValue,
): ResolutionRule[] =>
  // For now, use the same resolution order for all reference types
  // This can be expanded later if different resolution orders are needed
  [...getOnePartRules(), ...getTwoPartRules()];
