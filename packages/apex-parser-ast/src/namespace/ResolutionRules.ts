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
import { isPrimaryImplicitNamespace } from './NamespaceResolutionPolicy';

export const NamedScalarOrVoid: ResolutionRule = {
  name: 'NamedScalarOrVoid',
  priority: 1,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    return symbols.findScalarKeywordType(name);
  },
};

export const TopLevelTypeInSameNamespace: ResolutionRule = {
  name: 'TopLevelTypeInSameNamespace',
  priority: 6,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1 &&
    context.compilationContext.namespace !== null,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    const namespace = context.compilationContext.namespace;

    if (!namespace) return null;

    const candidateName = createTypeWithNamespace(namespace, name, {
      includeNamespace: true,
      normalizeCase: true,
      separator: '.',
    });
    return symbols.find(
      context.compilationContext.referencingType,
      candidateName,
    );
  },
};

export const BuiltInSystemSchema: ResolutionRule = {
  name: 'BuiltInSystemSchema',
  priority: 7,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    return symbols.findInDefaultNamespaceOrder(
      name,
      context.compilationContext.referencingType,
    );
  },
};

export const SObject: ResolutionRule = {
  name: 'SObject',
  priority: 8,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    return symbols.findSObjectType(name);
  },
};

export const FileBaseSystemNamespace: ResolutionRule = {
  name: 'FileBaseSystemNamespace',
  priority: 9,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    const currentNamespace =
      (typeof context.compilationContext.referencingType?.namespace === 'string'
        ? context.compilationContext.referencingType.namespace
        : context.compilationContext.referencingType?.namespace?.toString?.()) ||
      context.compilationContext.namespace?.toString?.();
    const shouldTryCurrentNamespaceFirst =
      !!currentNamespace &&
      !isPrimaryImplicitNamespace(currentNamespace) &&
      context.referenceType === 'METHOD';
    if (shouldTryCurrentNamespaceFirst) {
      const found = await symbols.findInExplicitNamespace(
        currentNamespace,
        name,
        context.compilationContext.referencingType,
      );
      if (found) return found;
    }

    return symbols.findInImplicitFileNamespaceSlot(
      name,
      0,
      context.compilationContext.referencingType,
    );
  },
};

export const FileBaseSchemaNamespace: ResolutionRule = {
  name: 'FileBaseSchemaNamespace',
  priority: 10,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    return symbols.findInImplicitFileNamespaceSlot(
      name,
      1,
      context.compilationContext.referencingType,
    );
  },
};

export const BuiltInMethodNamespace: ResolutionRule = {
  name: 'BuiltInMethodNamespace',
  priority: 11,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1 &&
    context.referenceType === 'METHOD',
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    const refType = context.compilationContext.referencingType;
    if ('findInAnyStandardNamespace' in symbols) {
      return (
        symbols as SymbolProviderWithStandardNamespace
      ).findInAnyStandardNamespace(name, refType);
    }
    return null;
  },
};

export const WorkspaceType: ResolutionRule = {
  name: 'WorkspaceType',
  priority: 12,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 1,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const name = context.adjustedNameParts[0];
    return symbols.find(context.compilationContext.referencingType, name);
  },
};

export const NamespaceAndTopLevelType: ResolutionRule = {
  name: 'NamespaceAndTopLevelType',
  priority: 4,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 2,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const [firstPart, secondPart] = context.adjustedNameParts;

    const namespace = Namespaces.create(firstPart);

    const candidateName = createTypeWithNamespace(namespace, secondPart);

    return symbols.find(
      context.compilationContext.referencingType,
      candidateName,
    );
  },
};

export const BuiltInNamespace: ResolutionRule = {
  name: 'BuiltInNamespace',
  priority: 5,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 2,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const [firstPart, secondPart] = context.adjustedNameParts;
    if (!(await symbols.isBuiltInNamespace(firstPart))) return null;
    return symbols.findInExplicitNamespace(
      firstPart,
      secondPart,
      context.compilationContext.referencingType,
    );
  },
};

export const SchemaSObject: ResolutionRule = {
  name: 'SchemaSObject',
  priority: 6,
  appliesTo: (context: NamespaceResolutionContext): boolean =>
    context.adjustedNameParts.length === 2,
  resolve: async (
    context: NamespaceResolutionContext,
    symbols: SymbolProvider,
  ): Promise<ApexSymbol | null> => {
    const [firstPart, secondPart] = context.adjustedNameParts;
    if (!(await symbols.isSObjectContainerNamespace(firstPart))) return null;
    return symbols.findSObjectType(secondPart);
  },
};

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

const DEFAULT_ONE_PART_ORDER = [
  NamedScalarOrVoid,
  TopLevelTypeInSameNamespace,
  BuiltInSystemSchema,
  SObject,
  FileBaseSystemNamespace,
  FileBaseSchemaNamespace,
  WorkspaceType,
];

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

export const getTwoPartRules = (): ResolutionRule[] =>
  [NamespaceAndTopLevelType, BuiltInNamespace, SchemaSObject].sort(
    (a, b) => a.priority - b.priority,
  );

export const getResolutionOrder = (
  referenceType: ReferenceTypeValue,
): ResolutionRule[] => {
  const onePartRules =
    referenceType === 'METHOD' ? METHOD_ONE_PART_ORDER : DEFAULT_ONE_PART_ORDER;
  return [...onePartRules, ...getTwoPartRules()];
};
