/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Effect from 'effect/Effect';
import * as vscode from 'vscode';
import type {
  MissingArtifactPayload,
  SObjectDescribeField,
  WireIdentifierSpec,
} from '@salesforce/apex-lsp-shared';
import { isWithinSObjectWireLimit } from '@salesforce/apex-lsp-shared';
import {
  type OrgArtifactServicesApi,
  type ServicesApiProvider,
  vscodeServicesApiProvider,
} from './org-artifact-adapter';

interface SourceComponent {
  readonly name: string;
  readonly fullName: string;
  readonly type: { readonly name: string };
  readonly xml?: string;
  readonly content?: string;
  readonly getChildren: () => SourceComponent[];
  readonly parseXml: () => Promise<Record<string, unknown>>;
}

interface ComponentSet {
  readonly getSourceComponents: () => Iterable<SourceComponent>;
}

export type WorkspaceComponentResolution =
  | {
      readonly kind: 'sobject';
      readonly artifact: MissingArtifactPayload;
    }
  | {
      readonly kind: 'source';
      readonly uri: vscode.Uri;
    };

/** Services-owned lookup for all locally source-backed Apex artifacts. */
export class WorkspaceComponentSetAdapter {
  constructor(
    private readonly provider: ServicesApiProvider = vscodeServicesApiProvider,
  ) {}

  async resolve(
    identifiers: readonly WireIdentifierSpec[],
  ): Promise<ReadonlyMap<string, WorkspaceComponentResolution>> {
    const requests = identifiers.flatMap(componentLookupMembers);
    if (requests.length === 0) return new Map();

    const api = await Effect.runPromise(this.provider.getServicesApi());
    const componentSet = (await Effect.runPromise(
      provideServices(
        api,
        api.services.ComponentSetService.getComponentSetFromProjectDirectories({
          metadataMembers: dedupeMembers(requests),
        }),
      ),
    )) as ComponentSet;
    const components = Array.from(componentSet.getSourceComponents());
    const resolutions = new Map<string, WorkspaceComponentResolution>();
    for (const identifier of identifiers) {
      const type = componentType(identifier);
      const candidates = componentCandidates(identifier);
      const component = candidates
        .map((name) =>
          components.find(
            (candidate) =>
              candidate.type.name === type &&
              candidate.fullName.toLowerCase() === name.toLowerCase(),
          ),
        )
        .find((candidate): candidate is SourceComponent => !!candidate);
      if (!component) continue;

      if (type === 'CustomObject' && component.xml) {
        const artifact = await composeWorkspaceArtifact(
          identifier.name,
          component,
          components,
        );
        if (isWithinSObjectWireLimit(artifact)) {
          resolutions.set(identifierKey(identifier), {
            kind: 'sobject',
            artifact,
          });
        }
      } else if (component.content) {
        resolutions.set(identifierKey(identifier), {
          kind: 'source',
          uri: sourcePathToUri(component.content),
        });
      }
    }
    return resolutions;
  }
}

function componentLookupMembers(
  identifier: WireIdentifierSpec,
): { type: string; fullName: string }[] {
  const type = componentType(identifier);
  return componentCandidates(identifier).flatMap((fullName) =>
    type === 'CustomObject'
      ? [
          { type, fullName },
          { type: 'CustomField', fullName: `${fullName}.*` },
        ]
      : [{ type, fullName }],
  );
}

export function workspaceIdentifierKey(identifier: WireIdentifierSpec): string {
  return identifierKey(identifier);
}

function identifierKey(identifier: WireIdentifierSpec): string {
  return `${identifier.identifierType ?? 'apex-class'}:${identifier.name
    .trim()
    .toLowerCase()}`;
}

function componentType(identifier: WireIdentifierSpec): string {
  switch (identifier.identifierType ?? 'apex-class') {
    case 'sobject':
      return 'CustomObject';
    case 'trigger':
      return 'ApexTrigger';
    default:
      return 'ApexClass';
  }
}

function componentCandidates(identifier: WireIdentifierSpec): string[] {
  const name = identifier.name.trim();
  if (!name) return [];
  if ((identifier.identifierType ?? 'apex-class') !== 'apex-class') {
    return [name];
  }
  const candidates = [
    name,
    identifier.resolvedQualifier?.name,
    identifier.typeReference?.qualifier,
    name.includes('.') ? name.split('.')[0] : undefined,
    name.includes('.') ? name.split('.').at(-1) : undefined,
    identifier.parentContext?.containingType?.name,
    ...(identifier.searchHints ?? []).flatMap((hint) =>
      hint.searchPatterns.flatMap(classNameFromPattern),
    ),
  ];
  return Array.from(
    new Map(
      candidates
        .filter((candidate): candidate is string => !!candidate?.trim())
        .map((candidate) => [candidate.toLowerCase(), candidate]),
    ).values(),
  );
}

function classNameFromPattern(pattern: string): string[] {
  const filename = pattern.split('/').at(-1);
  if (!filename?.toLowerCase().endsWith('.cls') || filename.includes('*')) {
    return [];
  }
  return [filename.slice(0, -4)];
}

function dedupeMembers(
  members: readonly { readonly type: string; readonly fullName: string }[],
): { type: string; fullName: string }[] {
  return Array.from(
    new Map(
      members.map((member) => [
        `${member.type.toLowerCase()}:${member.fullName.toLowerCase()}`,
        { type: member.type, fullName: member.fullName },
      ]),
    ).values(),
  );
}

async function composeWorkspaceArtifact(
  objectName: string,
  component: SourceComponent,
  allComponents: readonly SourceComponent[],
): Promise<MissingArtifactPayload> {
  const parsed = await component.parseXml();
  const objectMetadata = requireRecord(parsed, 'CustomObject');
  const objectTarget = { uri: sourcePathToUri(component.xml!).toString() };
  const fields = [
    ...systemFields(objectMetadata, objectTarget),
    ...nameField(objectMetadata, objectTarget),
  ];

  const fieldPrefix = `${component.fullName}.`.toLowerCase();
  const fieldComponents = dedupeSourceComponents([
    ...component.getChildren(),
    ...allComponents.filter(
      (candidate) =>
        candidate.type.name === 'CustomField' &&
        candidate.fullName.toLowerCase().startsWith(fieldPrefix),
    ),
  ]);
  for (const child of fieldComponents) {
    if (child.type.name !== 'CustomField' || !child.xml) continue;
    const childParsed = await child.parseXml();
    const metadata = requireRecord(childParsed, 'CustomField');
    const field = parseCustomField(metadata, child);
    if (field) fields.push(field);
  }

  fields.sort(compareByName);
  return {
    identifierType: 'sobject',
    name: objectName,
    describe: {
      name: objectName,
      label: stringProperty(objectMetadata, 'label'),
      labelPlural: stringProperty(objectMetadata, 'pluralLabel'),
      custom: objectName.includes('__'),
      fields,
      definitionTarget: objectTarget,
    },
  };
}

function dedupeSourceComponents(
  components: readonly SourceComponent[],
): SourceComponent[] {
  return Array.from(
    new Map(
      components.map((component) => [
        `${component.type.name.toLowerCase()}:${component.fullName.toLowerCase()}`,
        component,
      ]),
    ).values(),
  );
}

function nameField(
  objectMetadata: Record<string, unknown>,
  definitionTarget: { readonly uri: string },
): SObjectDescribeField[] {
  const candidate = objectMetadata.nameField;
  if (!isRecord(candidate)) return [];
  return [
    {
      name: 'Name',
      label: stringProperty(candidate, 'label'),
      type: metadataFieldTypeToDescribe(
        stringProperty(candidate, 'type') ?? 'Text',
      ),
      definitionTarget,
    },
  ];
}

function parseCustomField(
  metadata: Record<string, unknown>,
  component: SourceComponent,
): SObjectDescribeField | undefined {
  const name = stringProperty(metadata, 'fullName') ?? component.name;
  const metadataType = stringProperty(metadata, 'type');
  if (!name || !metadataType || !component.xml) return undefined;
  const referenceTo = stringArrayProperty(metadata, 'referenceTo');
  return {
    name,
    label: stringProperty(metadata, 'label'),
    type: metadataFieldTypeToDescribe(metadataType),
    ...(referenceTo.length > 0 && { referenceTo }),
    relationshipName: stringProperty(metadata, 'relationshipName'),
    nillable:
      stringProperty(metadata, 'required') === 'true' ? false : undefined,
    calculated: stringProperty(metadata, 'formula') !== undefined || undefined,
    length: numberProperty(metadata, 'length'),
    precision: numberProperty(metadata, 'precision'),
    scale: numberProperty(metadata, 'scale'),
    definitionTarget: { uri: sourcePathToUri(component.xml).toString() },
  };
}

function systemFields(
  objectMetadata: Record<string, unknown>,
  definitionTarget: { readonly uri: string },
): SObjectDescribeField[] {
  const field = (
    name: string,
    type: string,
    referenceTo?: readonly string[],
    relationshipName?: string,
  ): SObjectDescribeField => ({
    name,
    type,
    ...(referenceTo && { referenceTo }),
    ...(relationshipName && { relationshipName }),
    definitionTarget,
  });
  const fields = [
    field('CreatedById', 'reference', ['User'], 'CreatedBy'),
    field('CreatedDate', 'datetime'),
    field('Id', 'id'),
    field('IsDeleted', 'boolean'),
    field('LastModifiedById', 'reference', ['User'], 'LastModifiedBy'),
    field('LastModifiedDate', 'datetime'),
    field('LastReferencedDate', 'datetime'),
    field('LastViewedDate', 'datetime'),
    field('SystemModstamp', 'datetime'),
  ];
  if (stringProperty(objectMetadata, 'enableActivities') === 'true') {
    fields.push(field('LastActivityDate', 'date'));
  }
  if (stringProperty(objectMetadata, 'sharingModel') !== 'ControlledByParent') {
    fields.push(field('OwnerId', 'reference', ['Group', 'User'], 'Owner'));
  }
  return fields;
}

function metadataFieldTypeToDescribe(type: string): string {
  const mapping: Readonly<Record<string, string>> = {
    autonumber: 'string',
    checkbox: 'boolean',
    currency: 'currency',
    date: 'date',
    datetime: 'datetime',
    email: 'email',
    geolocation: 'location',
    location: 'location',
    longtextarea: 'textarea',
    lookup: 'reference',
    masterdetail: 'reference',
    multiselectpicklist: 'multipicklist',
    number: 'double',
    percent: 'percent',
    phone: 'phone',
    picklist: 'picklist',
    text: 'string',
    textarea: 'textarea',
    url: 'url',
  };
  const normalized = type.trim().toLowerCase();
  return mapping[normalized] ?? normalized;
}

function requireRecord(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const candidate = value[key];
  if (isRecord(candidate)) return candidate;
  throw new Error(`Component metadata is missing ${key}`);
}

function stringProperty(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : undefined;
}

function stringArrayProperty(
  value: Record<string, unknown>,
  key: string,
): string[] {
  const candidate = value[key];
  if (typeof candidate === 'string') return [candidate];
  return Array.isArray(candidate)
    ? candidate.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function numberProperty(
  value: Record<string, unknown>,
  key: string,
): number | undefined {
  const candidate = stringProperty(value, key);
  if (candidate === undefined) return undefined;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sourcePathToUri(sourcePath: string): vscode.Uri {
  if (/^[a-z][a-z0-9+.-]*:/i.test(sourcePath)) {
    return vscode.Uri.parse(sourcePath);
  }

  const fileUri = vscode.Uri.file(sourcePath);
  const sourceUriPath = normalizeUriPath(sourcePath);
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    if (folder.uri.scheme === 'file') continue;
    const workspaceUriPath = normalizeUriPath(folder.uri.path);
    if (
      sourceUriPath === workspaceUriPath ||
      sourceUriPath.startsWith(`${workspaceUriPath}/`)
    ) {
      return folder.uri.with({ path: sourceUriPath });
    }
  }
  return fileUri;
}

function normalizeUriPath(value: string): string {
  const normalized = value.replaceAll('\\', '/').replace(/\/+$/, '');
  return normalized || '/';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareByName(
  left: { readonly name: string },
  right: { readonly name: string },
): number {
  return (
    left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }) ||
    left.name.localeCompare(right.name, 'en')
  );
}

function provideServices<A>(
  api: OrgArtifactServicesApi,
  effect: Effect.Effect<A, unknown, unknown>,
): Effect.Effect<A, unknown> {
  return effect.pipe(
    Effect.provide(
      api.services
        .prebuiltServicesDependencies as import('effect/Context').Context<never>,
    ),
  ) as Effect.Effect<A, unknown>;
}
