/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SObjectDescribe } from '@salesforce/apex-lsp-shared';
import accountFixture from '../fixtures/sobjects/Account.describe.json';
import invoiceFixture from '../fixtures/sobjects/Invoice__c.describe.json';
import { CompilerService } from '../../src/parser/compilerService';
import {
  composeSObjectSymbolTable,
  composeSObjectPlaceholderSymbolTable,
  mapSalesforceFieldTypeToApex,
  ownerUriForSObject,
  SALESFORCE_FIELD_TYPE_TO_APEX,
  type SObjectFieldSymbol,
  type SObjectSymbol,
} from '../../src/sobjects/SObjectSymbolTableComposer';
import { SymbolKind, SymbolVisibility } from '../../src/types/symbol';

const account = accountFixture as SObjectDescribe;
const invoice = invoiceFixture as SObjectDescribe;

describe('SObjectSymbolTableComposer', () => {
  it('creates a stable, case-insensitive internal owner URI', () => {
    expect(ownerUriForSObject('Account')).toBe('apex-sobject://graph/account');
    expect(ownerUriForSObject(' account ')).toBe(ownerUriForSObject('ACCOUNT'));
    expect(ownerUriForSObject('ns__Invoice Item__c')).toBe(
      'apex-sobject://graph/ns__invoice%20item__c',
    );
  });

  it('composes a standard object and native fields', () => {
    const table = composeSObjectSymbolTable(account, 17);
    const root = table.getRoots()[0] as SObjectSymbol;
    const fields = table.getSymbolsInScope(root.id) as SObjectFieldSymbol[];

    expect(table.getFileUri()).toBe('apex-sobject://graph/account');
    expect(table.getMetadata()).toEqual({
      fileUri: 'apex-sobject://graph/account',
      documentVersion: 17,
      hasErrors: false,
      parseCompleteness: 'complete',
    });
    expect(root).toMatchObject({
      name: 'Account',
      kind: SymbolKind.SObject,
      fqn: 'Account',
      parentId: null,
      interfaces: [],
      definitionTarget: account.definitionTarget,
      modifiers: {
        visibility: SymbolVisibility.Public,
        isBuiltIn: false,
      },
    });
    expect(fields.map((field) => field.name)).toEqual([
      'AnnualRevenue',
      'Name',
      'Owner',
      'OwnerId',
    ]);
    expect(fields.every((field) => field.kind === SymbolKind.Field)).toBe(true);
    expect(fields.every((field) => field.parentId === root.id)).toBe(true);
    expect(fields.map((field) => field.fqn)).toEqual([
      'Account.AnnualRevenue',
      'Account.Name',
      'Account.Owner',
      'Account.OwnerId',
    ]);
    expect(fields.map((field) => field.type.name)).toEqual([
      'Decimal',
      'String',
      'User',
      'Id',
    ]);
  });

  it('composes custom fields, mixed definition targets, and relationships', () => {
    const table = composeSObjectSymbolTable(invoice, 2);
    const root = table.getRoots()[0] as SObjectSymbol;
    const fields = table.getSymbolsInScope(root.id) as SObjectFieldSymbol[];
    const accountId = fields.find((field) => field.name === 'Account__c');
    const relationship = fields.find((field) => field.name === 'Account__r');
    const name = fields.find((field) => field.name === 'Name');

    expect(root.name).toBe('Invoice__c');
    expect(root.definitionTarget?.uri).toMatch(/^sf-org-data:/);
    expect(name?.definitionTarget?.uri).toMatch(/^file:/);
    expect(accountId).toMatchObject({
      sObjectFieldName: 'Account__c',
      relationshipName: 'Account__r',
      referenceTo: ['Account'],
      type: { name: 'Id' },
    });
    expect(relationship).toMatchObject({
      sObjectFieldName: 'Account__c',
      relationshipName: 'Account__r',
      referenceTo: ['Account'],
      isRelationship: true,
      type: {
        name: 'Account',
        isPrimitive: false,
        needsNamespaceResolution: true,
      },
      definitionTarget: invoice.fields[1].definitionTarget,
    });
  });

  it('maps all supported Salesforce field types through a pure lookup table', () => {
    for (const [salesforceType, apexType] of Object.entries(
      SALESFORCE_FIELD_TYPE_TO_APEX,
    )) {
      expect(mapSalesforceFieldTypeToApex(salesforceType)).toBe(apexType);
      expect(mapSalesforceFieldTypeToApex(salesforceType.toUpperCase())).toBe(
        apexType,
      );
    }
  });

  it('preserves unknown field types without throwing', () => {
    const table = composeSObjectSymbolTable(invoice, 3);
    const root = table.getRoots()[0];
    const unknown = table.findSymbolInScope(
      root.id,
      'ExternalScore__c',
    ) as SObjectFieldSymbol;

    expect(unknown.type).toMatchObject({
      name: 'futurePlatformScalar',
      originalTypeString: 'futurePlatformScalar',
      isPrimitive: false,
      isBuiltIn: false,
      needsNamespaceResolution: true,
    });
  });

  it('retains all polymorphic relationship targets without guessing one type', () => {
    const polymorphic: SObjectDescribe = {
      ...account,
      fields: [
        {
          name: 'WhoId',
          type: 'reference',
          relationshipName: 'Who',
          referenceTo: ['Lead', 'Contact', 'Lead'],
          definitionTarget: { uri: 'org://Contact/WhoId' },
        },
      ],
    };

    const table = composeSObjectSymbolTable(polymorphic, 1);
    const root = table.getRoots()[0];
    const relationship = table.findSymbolInScope(
      root.id,
      'Who',
    ) as SObjectFieldSymbol;

    expect(relationship.type.name).toBe('SObject');
    expect(relationship.referenceTo).toEqual(['Contact', 'Lead']);
  });

  it('supports empty field lists', () => {
    const table = composeSObjectSymbolTable({ ...account, fields: [] }, 0);

    expect(table.getAllSymbols()).toHaveLength(1);
    expect(table.getRoots()[0].location.symbolRange).toEqual({
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: 'Account'.length,
    });
  });

  it('creates a non-navigable incomplete placeholder', () => {
    const table = composeSObjectPlaceholderSymbolTable('Invoice__c', 4);
    const root = table.getRoots()[0];

    expect(table.getMetadata()).toMatchObject({
      documentVersion: 4,
      parseCompleteness: 'incomplete',
    });
    expect(root).toMatchObject({
      name: 'Invoice__c',
      kind: SymbolKind.SObject,
    });
    expect(root.definitionTarget).toBeUndefined();
    expect(table.getAllSymbols()).toHaveLength(1);
  });

  it('produces deterministic ordering, IDs, and virtual ranges', () => {
    const reordered: SObjectDescribe = {
      ...account,
      fields: [...account.fields].reverse(),
    };
    const first = composeSObjectSymbolTable(account, 1);
    const second = composeSObjectSymbolTable(reordered, 9);

    const stableShape = (table: ReturnType<typeof composeSObjectSymbolTable>) =>
      table.getAllSymbols().map(({ id, name, location, parentId }) => ({
        id,
        name,
        location,
        parentId,
      }));

    expect(stableShape(second)).toEqual(stableShape(first));
    expect(
      first.getAllSymbols().map((symbol) => symbol.location.identifierRange),
    ).toEqual([
      {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 7,
      },
      {
        startLine: 2,
        startColumn: 2,
        endLine: 2,
        endColumn: 15,
      },
      {
        startLine: 3,
        startColumn: 2,
        endLine: 3,
        endColumn: 6,
      },
      {
        startLine: 4,
        startColumn: 2,
        endLine: 4,
        endColumn: 7,
      },
      {
        startLine: 5,
        startColumn: 2,
        endLine: 5,
        endColumn: 9,
      },
    ]);
  });

  it.each([
    ['missing describe', undefined],
    ['empty object name', { ...account, name: ' ' }],
    ['non-array fields', { ...account, fields: null }],
    [
      'field without a name',
      { ...account, fields: [{ ...account.fields[0], name: '' }] },
    ],
    [
      'field without a type',
      { ...account, fields: [{ ...account.fields[0], type: '' }] },
    ],
    [
      'field without a definition target',
      {
        ...account,
        fields: [{ ...account.fields[0], definitionTarget: undefined }],
      },
    ],
  ])('rejects malformed input: %s', (_description, malformed) => {
    expect(() =>
      composeSObjectSymbolTable(malformed as unknown as SObjectDescribe, 1),
    ).toThrow(TypeError);
  });

  it('rejects malformed versions', () => {
    expect(() => composeSObjectSymbolTable(account, -1)).toThrow(
      /non-negative integer/,
    );
    expect(() => composeSObjectSymbolTable(account, 1.5)).toThrow(
      /non-negative integer/,
    );
  });

  it('does not invoke CompilerService or parse Apex', () => {
    const compile = jest.spyOn(CompilerService.prototype, 'compile');

    composeSObjectSymbolTable(account, 1);

    expect(compile).not.toHaveBeenCalled();
    compile.mockRestore();
  });
});
