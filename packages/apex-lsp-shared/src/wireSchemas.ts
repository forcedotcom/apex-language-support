/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect.Schema definitions for the IdentifierSpec wire contract.
 *
 * These schemas define the exact plain-data shape of IdentifierSpec fields
 * that can safely cross the postMessage boundary (structured clone algorithm)
 * between the language server web worker and the VS Code extension client.
 *
 * Usage on the server: Schema.decodeUnknownSync(WireIdentifierSpecSchema)(id)
 * creates a new plain object from a live symbol manager class instance,
 * extracting only the declared fields and stripping non-serializable properties.
 *
 * Usage on the client: the Schema.Schema.Type<> types serve as the canonical
 * TypeScript types for identifiers received over the wire.
 */

import { Schema } from 'effect';

export const MAX_SOBJECT_WIRE_BYTES = 5 * 1024 * 1024;

const NonEmptyWireString = Schema.NonEmptyTrimmedString;

export function isWithinSObjectWireLimit(value: unknown): boolean {
  try {
    return (
      new TextEncoder().encode(JSON.stringify(value)).byteLength <=
      MAX_SOBJECT_WIRE_BYTES
    );
  } catch {
    return false;
  }
}

const PositionSchema = Schema.Struct({
  line: Schema.Number,
  character: Schema.Number,
});

const LspRangeSchema = Schema.Struct({
  start: PositionSchema,
  end: PositionSchema,
});

export const DefinitionTargetSchema = Schema.Struct({
  uri: NonEmptyWireString,
  range: Schema.optional(LspRangeSchema),
});
export type WireDefinitionTarget = Schema.Schema.Type<
  typeof DefinitionTargetSchema
>;

export const SObjectDescribeFieldSchema = Schema.Struct({
  name: NonEmptyWireString,
  label: Schema.optional(Schema.String),
  type: NonEmptyWireString,
  referenceTo: Schema.optional(Schema.Array(Schema.String)),
  relationshipName: Schema.optional(Schema.String),
  nillable: Schema.optional(Schema.Boolean),
  createable: Schema.optional(Schema.Boolean),
  updateable: Schema.optional(Schema.Boolean),
  calculated: Schema.optional(Schema.Boolean),
  length: Schema.optional(Schema.Number),
  precision: Schema.optional(Schema.Number),
  scale: Schema.optional(Schema.Number),
  definitionTarget: DefinitionTargetSchema,
});
export type WireSObjectDescribeField = Schema.Schema.Type<
  typeof SObjectDescribeFieldSchema
>;

export const SObjectDescribeSchema = Schema.Struct({
  name: NonEmptyWireString,
  label: Schema.optional(Schema.String),
  labelPlural: Schema.optional(Schema.String),
  custom: Schema.Boolean,
  queryable: Schema.optional(Schema.Boolean),
  createable: Schema.optional(Schema.Boolean),
  updateable: Schema.optional(Schema.Boolean),
  deletable: Schema.optional(Schema.Boolean),
  fields: Schema.Array(SObjectDescribeFieldSchema),
  definitionTarget: DefinitionTargetSchema,
});
export type WireSObjectDescribe = Schema.Schema.Type<
  typeof SObjectDescribeSchema
>;

export const MissingArtifactPayloadSchema = Schema.Struct({
  identifierType: Schema.Literal('sobject'),
  name: NonEmptyWireString,
  describe: SObjectDescribeSchema,
}).pipe(
  Schema.filter(isWithinSObjectWireLimit, {
    message: () =>
      `SObject artifact exceeds the ${MAX_SOBJECT_WIRE_BYTES}-byte wire limit`,
  }),
);
export type WireMissingArtifactPayload = Schema.Schema.Type<
  typeof MissingArtifactPayloadSchema
>;

export const FindMissingArtifactResultSchema = Schema.Union(
  Schema.Struct({
    artifacts: Schema.Array(MissingArtifactPayloadSchema),
    opened: Schema.optional(Schema.Array(Schema.String)),
  }),
  Schema.Struct({ opened: Schema.Array(Schema.String) }),
  Schema.Struct({ notFound: Schema.Literal(true) }),
  Schema.Struct({ accepted: Schema.Literal(true) }),
);
export type WireFindMissingArtifactResult = Schema.Schema.Type<
  typeof FindMissingArtifactResultSchema
>;

const RangeSchema = Schema.Struct({
  startLine: Schema.Number,
  startColumn: Schema.Number,
  endLine: Schema.Number,
  endColumn: Schema.Number,
});

const LocationSchema = Schema.Struct({
  symbolRange: RangeSchema,
  identifierRange: RangeSchema,
});

/** Wire-safe TypeReference — all fields from the TypeReference interface, no class instance extras. */
export const WireTypeReferenceSchema = Schema.Struct({
  name: Schema.String,
  location: LocationSchema,
  context: Schema.Union(Schema.String, Schema.Number),
  qualifier: Schema.optional(Schema.String),
  qualifierLocation: Schema.optional(LocationSchema),
  memberLocation: Schema.optional(LocationSchema),
  parentContext: Schema.optional(Schema.String),
  isResolved: Schema.optional(Schema.Boolean),
  access: Schema.optional(Schema.Literal('read', 'write', 'readwrite')),
});
export type WireTypeReference = Schema.Schema.Type<
  typeof WireTypeReferenceSchema
>;

export const WireSearchHintSchema = Schema.Struct({
  searchPatterns: Schema.Array(Schema.String),
  priority: Schema.Literal('exact', 'high', 'medium', 'low'),
  reasoning: Schema.String,
  expectedFileType: Schema.Literal('class', 'trigger'),
  namespace: Schema.optional(Schema.String),
  fallbackPatterns: Schema.optional(Schema.Array(Schema.String)),
  confidence: Schema.Number,
});
export type WireSearchHint = Schema.Schema.Type<typeof WireSearchHintSchema>;

export const WireResolvedQualifierSchema = Schema.Struct({
  type: Schema.Literal('class', 'interface', 'enum', 'variable', 'unknown'),
  name: Schema.String,
  namespace: Schema.optional(Schema.String),
  isStatic: Schema.Boolean,
  filePath: Schema.optional(Schema.String),
});
export type WireResolvedQualifier = Schema.Schema.Type<
  typeof WireResolvedQualifierSchema
>;

/** Minimal serializable summary of a symbol — name only, extracted from class instances. */
const WireSymbolSummarySchema = Schema.Struct({ name: Schema.String });

/**
 * Wire-safe ParentContext.
 * parentSymbol is omitted — it is a Symbol class instance with no wire representation.
 * ancestorChain entries are reduced to { name } for forward-compatibility.
 */
export const WireParentContextSchema = Schema.Struct({
  containingType: Schema.optional(WireSymbolSummarySchema),
  ancestorChain: Schema.optional(Schema.Array(WireSymbolSummarySchema)),
  contextualHierarchy: Schema.optional(Schema.String),
});
export type WireParentContext = Schema.Schema.Type<
  typeof WireParentContextSchema
>;

export const WireSemanticArtifactProvenanceSchema = Schema.Struct({
  sourceUri: Schema.String,
  documentVersion: Schema.optional(Schema.Number),
  referenceRange: RangeSchema,
  referenceIdentity: Schema.String,
  resolvedSymbolId: Schema.optional(Schema.String),
  resolvedTypeId: Schema.optional(Schema.String),
  parseCompleteness: Schema.Literal('complete', 'incomplete', 'unknown'),
});
export type WireSemanticArtifactProvenance = Schema.Schema.Type<
  typeof WireSemanticArtifactProvenanceSchema
>;

/** Wire-safe form of IdentifierSpec — all plain-data fields, safe for postMessage. */
export const WireIdentifierSpecSchema = Schema.Struct({
  name: Schema.String,
  // Optional on the wire for rolling upgrades. The semantic boundary rejects
  // identifiers without provenance before they can trigger artifact loading.
  provenance: Schema.optional(WireSemanticArtifactProvenanceSchema),
  identifierType: Schema.optional(
    Schema.Literal('sobject', 'apex-class', 'trigger'),
  ),
  typeReference: Schema.optional(WireTypeReferenceSchema),
  searchHints: Schema.optional(Schema.Array(WireSearchHintSchema)),
  resolvedQualifier: Schema.optional(WireResolvedQualifierSchema),
  parentContext: Schema.optional(WireParentContextSchema),
});
export type WireIdentifierSpec = Schema.Schema.Type<
  typeof WireIdentifierSpecSchema
>;
