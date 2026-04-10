/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  BuiltInNamespace,
  BuiltInSystemSchema,
  FileBaseSchemaNamespace,
  FileBaseSystemNamespace,
  SchemaSObject,
} from '../../src/namespace/ResolutionRules';
import {
  IdentifierContext,
  Namespaces,
  ReferenceTypeEnum,
  SymbolProvider,
  type NamespaceResolutionContext,
} from '../../src/namespace/NamespaceUtils';
import {
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
  type ApexSymbol,
} from '../../src/types/symbol';

const mockLocation = {
  identifierRange: {
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 10,
  },
  symbolRange: {
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 10,
  },
};

const mockModifiers = {
  visibility: SymbolVisibility.Public,
  isStatic: false,
  isFinal: false,
  isAbstract: false,
  isTransient: false,
  isGlobal: false,
  isTest: false,
  isDeprecated: false,
  isOverride: false,
  isVirtual: false,
  isTestMethod: false,
  isWebService: false,
  isBuiltIn: false,
};

const createReferencingType = (): ApexSymbol =>
  SymbolFactory.createFullSymbol(
    'RefType',
    SymbolKind.Class,
    mockLocation,
    'file:///test/RefType.cls',
    mockModifiers,
  );

const createResolved = (name: string): ApexSymbol =>
  SymbolFactory.createFullSymbol(
    name,
    SymbolKind.Class,
    mockLocation,
    `file:///stdlib/${name}.cls`,
    mockModifiers,
  );

const createContext = (
  adjustedNameParts: string[],
): NamespaceResolutionContext => {
  const referencingType = createReferencingType();
  return {
    compilationContext: {
      namespace: Namespaces.create(''),
      version: 60,
      isTrusted: true,
      sourceType: 'FILE',
      referencingType,
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: true,
    },
    referenceType: ReferenceTypeEnum.METHOD,
    identifierContext: IdentifierContext.NONE,
    nameParts: adjustedNameParts,
    adjustedNameParts,
    isCaseInsensitive: true,
  };
};

const createProvider = (): jest.Mocked<SymbolProvider> => ({
  find: jest.fn(),
  findScalarKeywordType: jest.fn(),
  findSObjectType: jest.fn(),
  findExternalType: jest.fn(),
  findInDefaultNamespaceOrder: jest.fn(),
  findInImplicitFileNamespaceSlot: jest.fn(),
  findInExplicitNamespace: jest.fn(),
  isBuiltInNamespace: jest.fn(),
  isSObjectContainerNamespace: jest.fn(),
});

describe('ResolutionRules delegation', () => {
  it('BuiltInSystemSchema delegates to findInDefaultNamespaceOrder', () => {
    const context = createContext(['test']);
    const provider = createProvider();
    const resolved = createResolved('Test');
    provider.findInDefaultNamespaceOrder.mockReturnValue(resolved);

    const result = BuiltInSystemSchema.resolve(context, provider);

    expect(result).toBe(resolved);
    expect(provider.findInDefaultNamespaceOrder).toHaveBeenCalledWith(
      'test',
      context.compilationContext.referencingType,
    );
  });

  it('FileBaseSystemNamespace delegates to implicit slot 0', () => {
    const context = createContext(['test']);
    const provider = createProvider();
    const resolved = createResolved('Test');
    provider.findInImplicitFileNamespaceSlot.mockReturnValue(resolved);

    const result = FileBaseSystemNamespace.resolve(context, provider);

    expect(result).toBe(resolved);
    expect(provider.findInImplicitFileNamespaceSlot).toHaveBeenCalledWith(
      'test',
      0,
      context.compilationContext.referencingType,
    );
  });

  it('FileBaseSchemaNamespace delegates to implicit slot 1', () => {
    const context = createContext(['account']);
    const provider = createProvider();
    const resolved = createResolved('Account');
    provider.findInImplicitFileNamespaceSlot.mockReturnValue(resolved);

    const result = FileBaseSchemaNamespace.resolve(context, provider);

    expect(result).toBe(resolved);
    expect(provider.findInImplicitFileNamespaceSlot).toHaveBeenCalledWith(
      'account',
      1,
      context.compilationContext.referencingType,
    );
  });

  it('BuiltInNamespace only resolves when provider says namespace is built-in', () => {
    const context = createContext(['system', 'assert']);
    const provider = createProvider();
    const resolved = createResolved('Assert');

    provider.isBuiltInNamespace.mockReturnValue(false);
    expect(BuiltInNamespace.resolve(context, provider)).toBeNull();
    expect(provider.findInExplicitNamespace).not.toHaveBeenCalled();

    provider.isBuiltInNamespace.mockReturnValue(true);
    provider.findInExplicitNamespace.mockReturnValue(resolved);
    expect(BuiltInNamespace.resolve(context, provider)).toBe(resolved);
    expect(provider.findInExplicitNamespace).toHaveBeenCalledWith(
      'system',
      'assert',
      context.compilationContext.referencingType,
    );
  });

  it('SchemaSObject checks provider namespace classification before SObject lookup', () => {
    const context = createContext(['schema', 'account']);
    const provider = createProvider();
    const resolved = createResolved('Account');

    provider.isSObjectContainerNamespace.mockReturnValue(false);
    expect(SchemaSObject.resolve(context, provider)).toBeNull();
    expect(provider.findSObjectType).not.toHaveBeenCalled();

    provider.isSObjectContainerNamespace.mockReturnValue(true);
    provider.findSObjectType.mockReturnValue(resolved);
    expect(SchemaSObject.resolve(context, provider)).toBe(resolved);
    expect(provider.findSObjectType).toHaveBeenCalledWith('account');
  });
});
