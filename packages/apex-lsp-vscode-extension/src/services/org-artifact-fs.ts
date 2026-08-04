/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { DefinitionTarget } from '@salesforce/apex-lsp-shared';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import * as vscode from 'vscode';
import type { TextDocumentFilter } from 'vscode-languageserver-protocol';
import {
  type OrgArtifactServicesApi,
  type ServicesApiProvider,
  vscodeServicesApiProvider,
} from './org-artifact-adapter';

const ORG_ARTIFACT_SCHEME = 'apex-org-artifact';
const ORG_ARTIFACT_SOURCE_PATTERNS = ['**/*.cls', '**/*.trigger'] as const;

/**
 * Selectors for temporary documents containing real Apex source.
 *
 * The rendered sObject documents intentionally have a different suffix and
 * therefore never participate in language-client synchronization.
 */
export function getOrgArtifactSourceDocumentSelectors(): TextDocumentFilter[] {
  return ORG_ARTIFACT_SOURCE_PATTERNS.map((pattern) => ({
    scheme: ORG_ARTIFACT_SCHEME,
    language: 'apex',
    pattern,
  }));
}

export interface SObjectDocumentField {
  readonly name: string;
  readonly label?: string;
  readonly type: string;
  readonly relationshipName?: string;
  readonly referenceTo?: readonly string[];
}

export interface SObjectDocumentInput {
  readonly name: string;
  readonly label?: string;
  readonly labelPlural?: string;
  readonly custom: boolean;
  readonly fields: readonly SObjectDocumentField[];
}

export interface StagedSObjectDocument {
  readonly objectTarget: DefinitionTarget;
  readonly fieldTargets: ReadonlyMap<string, DefinitionTarget>;
  readonly commit: () => boolean;
}

export interface SourceMaterializationInput {
  readonly kind: 'apex-class' | 'trigger';
  readonly name: string;
  readonly namespace?: string;
  readonly source: string;
}

interface StoredDocument {
  readonly uri: vscode.Uri;
  readonly content: string;
}

/**
 * Temporary read-only store for org artifacts.
 *
 * URI creation remains private to this module. Consumers receive an opaque URI
 * or DefinitionTarget and must not infer paths or schemes from it.
 */
export class OrgArtifactFileSystem
  implements vscode.TextDocumentContentProvider
{
  private readonly documents = new Map<string, StoredDocument>();
  private readonly changeEmitter = new vscode.EventEmitter<vscode.Uri>();
  private currentGeneration = 0;

  readonly onDidChange = this.changeEmitter.event;

  provideTextDocumentContent(uri: vscode.Uri): string | undefined {
    return this.documents.get(uri.toString())?.content;
  }

  stageSObject(
    input: SObjectDocumentInput,
    generation = this.currentGeneration,
  ): StagedSObjectDocument {
    const uri = createArtifactUri('sobject', input.name, '.sobject.json');
    const rendered = renderSObjectDocument(input);
    const stored: StoredDocument = {
      uri,
      content: rendered.content,
    };
    return {
      objectTarget: {
        uri: uri.toString(),
        range: rendered.objectRange,
      },
      fieldTargets: new Map(
        rendered.fieldRanges.map(([name, range]) => [
          name.toLowerCase(),
          { uri: uri.toString(), range },
        ]),
      ),
      commit: () => {
        if (generation !== this.currentGeneration) {
          return false;
        }
        this.store(stored);
        return true;
      },
    };
  }

  materializeSource(
    input: SourceMaterializationInput,
    generation = this.currentGeneration,
  ): vscode.Uri | undefined {
    if (generation !== this.currentGeneration) {
      return undefined;
    }
    const qualifiedName = input.namespace
      ? `${input.namespace}.${input.name}`
      : input.name;
    const extension = input.kind === 'apex-class' ? '.cls' : '.trigger';
    const uri = createArtifactUri(input.kind, qualifiedName, extension);
    this.store({ uri, content: input.source });
    return uri;
  }

  invalidate(uri: vscode.Uri): void {
    if (this.documents.delete(uri.toString())) {
      this.changeEmitter.fire(uri);
    }
  }

  clear(): void {
    const uris = Array.from(
      this.documents.values(),
      (document) => document.uri,
    );
    this.documents.clear();
    this.currentGeneration++;
    for (const uri of uris) {
      this.changeEmitter.fire(uri);
    }
  }

  get size(): number {
    return this.documents.size;
  }

  get generation(): number {
    return this.currentGeneration;
  }

  private store(document: StoredDocument): void {
    this.documents.set(document.uri.toString(), document);
    this.changeEmitter.fire(document.uri);
  }
}

let fileSystemInstance: OrgArtifactFileSystem | undefined;

export function getOrgArtifactFileSystem(): OrgArtifactFileSystem {
  return (fileSystemInstance ??= new OrgArtifactFileSystem());
}

export function registerOrgArtifactFileSystem(
  context: vscode.ExtensionContext,
  provider: ServicesApiProvider = vscodeServicesApiProvider,
): OrgArtifactFileSystem {
  const fileSystem = getOrgArtifactFileSystem();
  const registration = vscode.workspace.registerTextDocumentContentProvider(
    ORG_ARTIFACT_SCHEME,
    fileSystem,
  );
  context.subscriptions.push(registration);
  context.subscriptions.push(startOrgChangeWatcher(fileSystem, provider));
  return fileSystem;
}

export function startOrgChangeWatcher(
  fileSystem: OrgArtifactFileSystem,
  provider: ServicesApiProvider,
  onOrgChange?: () => Promise<void> | void,
): vscode.Disposable {
  const watchEffect = provider.getServicesApi().pipe(
    Effect.flatMap((api) => {
      const targetOrgRef = api.services.TargetOrgRef;
      if (!targetOrgRef) {
        return Effect.void;
      }
      return provideServices(api, targetOrgRef()).pipe(
        Effect.flatMap((ref) =>
          ref.changes.pipe(
            Stream.map((value) => ({
              value,
              identity: targetOrgIdentity(value),
            })),
            Stream.changesWith(
              (left, right) => left.identity === right.identity,
            ),
            Stream.drop(1),
            Stream.runForEach(() =>
              Effect.gen(function* () {
                fileSystem.clear();
                // Switching orgs is ordinary state invalidation. Never restart
                // the language server from this watcher.
                if (onOrgChange) {
                  yield* Effect.tryPromise(() =>
                    Promise.resolve(onOrgChange()),
                  );
                }
              }).pipe(Effect.catchAll(() => Effect.void)),
            ),
          ),
        ),
      );
    }),
    Effect.catchAll(() => Effect.void),
  );
  const fiber = Effect.runFork(watchEffect);
  return new vscode.Disposable(() => {
    Effect.runFork(Fiber.interrupt(fiber));
  });
}

/**
 * TargetOrgRef may publish newly allocated wrappers for the same org. Restart
 * only when stable org identity changes; otherwise a restart can itself cause
 * another ref emission and form a language-client restart loop.
 */
function targetOrgIdentity(value: unknown): string {
  const identity = findTargetOrgIdentity(value, new Set<object>());
  return identity ?? stablePrimitiveShape(value, new Set<object>());
}

function findTargetOrgIdentity(
  value: unknown,
  visited: Set<object>,
): string | undefined {
  if (!isRecord(value) || visited.has(value)) {
    return undefined;
  }
  visited.add(value);
  const identityKeys = [
    'orgId',
    'organizationId',
    'username',
    'alias',
    'instanceUrl',
  ] as const;
  const parts = identityKeys.flatMap((key) => {
    const candidate = value[key];
    return typeof candidate === 'string' && candidate.length > 0
      ? [`${key}:${candidate}`]
      : [];
  });
  if (parts.length > 0) {
    return parts.join('|');
  }
  for (const key of ['value', 'current', 'targetOrg', 'org'] as const) {
    const nested = findTargetOrgIdentity(value[key], visited);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

function stablePrimitiveShape(value: unknown, visited: Set<object>): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (visited.has(value)) {
    return '"[circular]"';
  }
  visited.add(value);
  if (Array.isArray(value)) {
    return `[${value
      .map((entry) => stablePrimitiveShape(entry, visited))
      .join(',')}]`;
  }
  return `{${Object.keys(value)
    .filter((key) => !/token|secret|password|authorization/i.test(key))
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stablePrimitiveShape(
          (value as Record<string, unknown>)[key],
          visited,
        )}`,
    )
    .join(',')}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function createArtifactUri(
  kind: 'sobject' | 'apex-class' | 'trigger',
  name: string,
  extension: string,
): vscode.Uri {
  const encodedName = encodeURIComponent(name.trim().toLowerCase());
  return vscode.Uri.parse(
    `${ORG_ARTIFACT_SCHEME}:/${kind}/${encodedName}${extension}`,
  );
}

function renderSObjectDocument(input: SObjectDocumentInput): {
  readonly content: string;
  readonly objectRange: DefinitionTarget['range'];
  readonly fieldRanges: readonly [
    string,
    NonNullable<DefinitionTarget['range']>,
  ][];
} {
  const fields = [...input.fields].sort(compareByName);
  const lines = [
    '{',
    '  "kind": "SalesforceObject",',
    `  "name": ${JSON.stringify(input.name)},`,
    `  "label": ${JSON.stringify(input.label ?? input.name)},`,
    `  "labelPlural": ${JSON.stringify(input.labelPlural ?? input.label ?? input.name)},`,
    `  "custom": ${input.custom ? 'true' : 'false'},`,
    '  "fields": [',
  ];
  const objectRange = valueRange(lines[2], input.name, 2);
  const fieldRanges: [string, NonNullable<DefinitionTarget['range']>][] = [];

  fields.forEach((field, index) => {
    const serialized = JSON.stringify({
      name: field.name,
      label: field.label ?? field.name,
      type: field.type,
      relationshipName: field.relationshipName,
      referenceTo: field.referenceTo,
    });
    const suffix = index === fields.length - 1 ? '' : ',';
    const line = `    ${serialized}${suffix}`;
    const lineNumber = lines.length;
    lines.push(line);
    fieldRanges.push([field.name, valueRange(line, field.name, lineNumber)]);
  });
  lines.push('  ]', '}');
  return {
    content: `${lines.join('\n')}\n`,
    objectRange,
    fieldRanges,
  };
}

function valueRange(
  line: string,
  value: string,
  lineNumber: number,
): NonNullable<DefinitionTarget['range']> {
  const quotedValue = JSON.stringify(value);
  const quotedStart = line.indexOf(quotedValue);
  const startCharacter = quotedStart >= 0 ? quotedStart + 1 : 0;
  return {
    start: { line: lineNumber, character: startCharacter },
    end: {
      line: lineNumber,
      character: startCharacter + value.length,
    },
  };
}

function compareByName(
  left: { readonly name: string },
  right: { readonly name: string },
): number {
  return (
    left.name.localeCompare(right.name, 'en', {
      sensitivity: 'base',
    }) || left.name.localeCompare(right.name, 'en')
  );
}
