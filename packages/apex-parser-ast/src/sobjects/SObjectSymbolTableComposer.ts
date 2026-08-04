/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  DefinitionTarget,
  SObjectDescribe,
  SObjectDescribeField,
} from '@salesforce/apex-lsp-shared';
import {
  SymbolFactory,
  SymbolKind,
  SymbolTable,
  SymbolVisibility,
  type SymbolLocation,
  type SymbolModifiers,
  type TypeSymbol,
  type VariableSymbol,
} from '../types/symbol';
import { createPrimitiveType, type TypeInfo } from '../types/typeInfo';

const OWNER_URI_PREFIX = 'apex-sobject://graph/';

/**
 * Salesforce describe field types mapped to their Apex value types.
 *
 * Keys are normalized to lowercase before lookup. Unknown values deliberately
 * fall through to their source spelling so a newer platform type does not make
 * composition fail.
 */
export const SALESFORCE_FIELD_TYPE_TO_APEX = Object.freeze({
  address: 'Address',
  anytype: 'Object',
  base64: 'Blob',
  boolean: 'Boolean',
  combobox: 'String',
  currency: 'Decimal',
  date: 'Date',
  datetime: 'Datetime',
  double: 'Decimal',
  email: 'String',
  encryptedstring: 'String',
  id: 'Id',
  int: 'Integer',
  location: 'Location',
  long: 'Long',
  multipicklist: 'String',
  percent: 'Decimal',
  phone: 'String',
  picklist: 'String',
  reference: 'Id',
  string: 'String',
  textarea: 'String',
  time: 'Time',
  url: 'String',
} satisfies Readonly<Record<string, string>>);

export interface SObjectFieldSymbol extends VariableSymbol {
  /** Original describe field that produced this symbol. */
  sObjectFieldName: string;
  /** Relationship accessor exposed by Apex, when supplied by describe. */
  relationshipName?: string;
  /** All possible relationship targets, retained for polymorphic references. */
  referenceTo?: readonly string[];
  /** True when this is the relationship accessor synthesized beside an Id field. */
  isRelationship?: boolean;
}

export interface SObjectSymbol extends TypeSymbol {
  kind: SymbolKind.SObject;
}

interface ComposedField {
  readonly name: string;
  readonly source: SObjectDescribeField;
  readonly apexType: string;
  readonly isRelationship: boolean;
}

/**
 * Return the stable graph-ownership URI for an sObject.
 *
 * This URI is intentionally internal. Editor navigation must use each symbol's
 * definitionTarget instead of this owner.
 */
export function ownerUriForSObject(name: string): string {
  const normalizedName = requireNonEmptyString(name, 'sObject name');
  return `${OWNER_URI_PREFIX}${encodeURIComponent(normalizedName.toLowerCase())}`;
}

/** Map a Salesforce describe field type to its Apex spelling. */
export function mapSalesforceFieldTypeToApex(fieldType: string): string {
  const normalizedType = requireNonEmptyString(fieldType, 'sObject field type');
  return (
    SALESFORCE_FIELD_TYPE_TO_APEX[
      normalizedType.toLowerCase() as keyof typeof SALESFORCE_FIELD_TYPE_TO_APEX
    ] ?? normalizedType
  );
}

/**
 * Compose describe metadata directly into a native SymbolTable.
 *
 * No Apex source is generated or parsed. Ordering and locations are derived
 * only from normalized describe data, making repeated composition stable.
 */
export function composeSObjectSymbolTable(
  describe: SObjectDescribe,
  version: number,
): SymbolTable {
  validateDescribe(describe);
  validateVersion(version);

  const objectName = describe.name.trim();
  const ownerUri = ownerUriForSObject(objectName);
  const fields = buildComposedFields(describe.fields);
  const lastLine = Math.max(1, fields.length + 1);
  const table = new SymbolTable();
  table.setFileUri(ownerUri);
  table.setMetadata({
    fileUri: ownerUri,
    documentVersion: version,
    hasErrors: false,
    parseCompleteness: 'complete',
  });

  const root = SymbolFactory.createFullSymbol(
    objectName,
    SymbolKind.SObject,
    locationForName(objectName, 1, 0, lastLine),
    ownerUri,
    createModifiers(),
    null,
    undefined,
    objectName,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ) as SObjectSymbol;
  root.interfaces = [];
  root.definitionTarget = cloneDefinitionTarget(describe.definitionTarget);
  table.addSymbol(root);

  fields.forEach((field, index) => {
    const line = index + 2;
    const symbol = SymbolFactory.createFullSymbol(
      field.name,
      SymbolKind.Field,
      locationForName(field.name, line, 2, line),
      ownerUri,
      createModifiers(),
      root.id,
      undefined,
      `${objectName}.${field.name}`,
      undefined,
      undefined,
      undefined,
      undefined,
      [objectName],
    ) as SObjectFieldSymbol;
    symbol.type = createFieldTypeInfo(field.apexType);
    symbol.definitionTarget = cloneDefinitionTarget(
      field.source.definitionTarget,
    );
    symbol.sObjectFieldName = field.source.name.trim();
    symbol.relationshipName = optionalTrimmed(field.source.relationshipName);
    symbol.referenceTo = normalizeReferenceTargets(field.source.referenceTo);
    symbol.isRelationship = field.isRelationship || undefined;
    table.addSymbol(symbol);
  });

  return table;
}

/**
 * Compose an incomplete name-only table used while org metadata is in flight.
 * The placeholder deliberately has no definitionTarget: its owner URI is graph
 * identity only and must never become an editor navigation destination.
 */
export function composeSObjectPlaceholderSymbolTable(
  name: string,
  version: number,
): SymbolTable {
  const objectName = requireNonEmptyString(name, 'sObject name');
  validateVersion(version);
  const ownerUri = ownerUriForSObject(objectName);
  const table = new SymbolTable();
  table.setFileUri(ownerUri);
  table.setMetadata({
    fileUri: ownerUri,
    documentVersion: version,
    hasErrors: false,
    parseCompleteness: 'incomplete',
  });

  const root = SymbolFactory.createFullSymbol(
    objectName,
    SymbolKind.SObject,
    locationForName(objectName, 1, 0, 1),
    ownerUri,
    createModifiers(),
    null,
    undefined,
    objectName,
  ) as SObjectSymbol;
  root.interfaces = [];
  table.addSymbol(root);
  return table;
}

function buildComposedFields(
  fields: readonly SObjectDescribeField[],
): readonly ComposedField[] {
  const composed: ComposedField[] = [];
  const sourceNames = new Set(
    fields.map((field) => field.name.trim().toLowerCase()),
  );
  const relationshipNames = new Set<string>();

  for (const field of fields) {
    const name = field.name.trim();
    composed.push({
      name,
      source: field,
      apexType: mapSalesforceFieldTypeToApex(field.type),
      isRelationship: false,
    });

    const relationshipName = optionalTrimmed(field.relationshipName);
    if (
      field.type.trim().toLowerCase() !== 'reference' ||
      !relationshipName ||
      sourceNames.has(relationshipName.toLowerCase()) ||
      relationshipNames.has(relationshipName.toLowerCase())
    ) {
      continue;
    }

    relationshipNames.add(relationshipName.toLowerCase());
    const targets = normalizeReferenceTargets(field.referenceTo);
    composed.push({
      name: relationshipName,
      source: field,
      apexType: targets.length === 1 ? targets[0] : 'SObject',
      isRelationship: true,
    });
  }

  return composed.sort(compareComposedFields);
}

function compareComposedFields(a: ComposedField, b: ComposedField): number {
  const caseInsensitive = a.name.localeCompare(b.name, 'en', {
    sensitivity: 'base',
  });
  if (caseInsensitive !== 0) {
    return caseInsensitive;
  }
  const exact = a.name.localeCompare(b.name, 'en');
  if (exact !== 0) {
    return exact;
  }
  return Number(a.isRelationship) - Number(b.isRelationship);
}

function createFieldTypeInfo(apexType: string): TypeInfo {
  const mappedType = Object.values(SALESFORCE_FIELD_TYPE_TO_APEX).includes(
    apexType,
  );
  if (mappedType) {
    return createPrimitiveType(apexType);
  }
  return {
    name: apexType,
    isArray: false,
    isCollection: false,
    isPrimitive: false,
    isBuiltIn: apexType === 'SObject',
    originalTypeString: apexType,
    needsNamespaceResolution: apexType !== 'SObject',
    getNamespace: () => null,
  };
}

function createModifiers(): SymbolModifiers {
  return {
    visibility: SymbolVisibility.Public,
    isStatic: false,
    isFinal: false,
    isAbstract: false,
    isVirtual: false,
    isOverride: false,
    isTransient: false,
    isTestMethod: false,
    isWebService: false,
    isBuiltIn: false,
  };
}

function locationForName(
  name: string,
  line: number,
  startColumn: number,
  endLine: number,
): SymbolLocation {
  return {
    symbolRange: {
      startLine: line,
      startColumn,
      endLine,
      endColumn: endLine === line ? startColumn + name.length : 0,
    },
    identifierRange: {
      startLine: line,
      startColumn,
      endLine: line,
      endColumn: startColumn + name.length,
    },
  };
}

function normalizeReferenceTargets(
  targets: readonly string[] | undefined,
): readonly string[] {
  if (!targets) {
    return [];
  }
  return [
    ...new Set(targets.map((target) => target.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

function cloneDefinitionTarget(target: DefinitionTarget): DefinitionTarget {
  return target.range
    ? {
        uri: target.uri,
        range: {
          start: { ...target.range.start },
          end: { ...target.range.end },
        },
      }
    : { uri: target.uri };
}

function optionalTrimmed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateDescribe(
  describe: SObjectDescribe,
): asserts describe is SObjectDescribe {
  if (!describe || typeof describe !== 'object') {
    throw new TypeError('sObject describe must be an object');
  }
  requireNonEmptyString(describe.name, 'sObject name');
  validateDefinitionTarget(describe.definitionTarget, 'sObject');
  if (!Array.isArray(describe.fields)) {
    throw new TypeError('sObject fields must be an array');
  }
  for (const [index, field] of describe.fields.entries()) {
    if (!field || typeof field !== 'object') {
      throw new TypeError(`sObject field at index ${index} must be an object`);
    }
    requireNonEmptyString(field.name, `sObject field name at index ${index}`);
    requireNonEmptyString(field.type, `sObject field type at index ${index}`);
    validateDefinitionTarget(
      field.definitionTarget,
      `sObject field ${field.name}`,
    );
  }
}

function validateDefinitionTarget(
  target: DefinitionTarget,
  description: string,
): void {
  if (!target || typeof target !== 'object') {
    throw new TypeError(`${description} definition target must be an object`);
  }
  requireNonEmptyString(target.uri, `${description} definition target URI`);
}

function validateVersion(version: number): void {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new TypeError(
      'sObject symbol table version must be a non-negative integer',
    );
  }
}

function requireNonEmptyString(value: string, description: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${description} must be a non-empty string`);
  }
  return value.trim();
}
