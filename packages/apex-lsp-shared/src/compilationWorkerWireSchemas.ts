/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Schema } from 'effect';

/**
 * Portable protocol for the dedicated Apex compilation worker pool.
 *
 * This contract is intentionally independent of the coordinator/data-owner
 * worker protocol. A compilation worker accepts one source file and returns a
 * pure-data symbol table. Node worker_threads and browser Web Workers use the
 * same request and result schemas.
 */

export const CompilationDetailLevel = Schema.Literal('public-api', 'full');
export type CompilationDetailLevel = Schema.Schema.Type<
  typeof CompilationDetailLevel
>;

export const SerializedParserDiagnostic = Schema.Struct({
  type: Schema.String,
  severity: Schema.String,
  message: Schema.String,
  line: Schema.Number,
  column: Schema.Number,
  endLine: Schema.optional(Schema.Number),
  endColumn: Schema.optional(Schema.Number),
  fileUri: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
});
export type SerializedParserDiagnostic = Schema.Schema.Type<
  typeof SerializedParserDiagnostic
>;

export const SerializedCompilationSymbolTable = Schema.Struct({
  // Symbol/reference payloads already have an established JSON wire shape.
  // Keep their leaves opaque here while making the table envelope explicit.
  symbols: Schema.Array(Schema.Unknown),
  references: Schema.Array(Schema.Unknown),
  hierarchicalReferences: Schema.Array(Schema.Unknown),
  metadata: Schema.Struct({
    fileUri: Schema.String,
    documentVersion: Schema.Number,
    hasErrors: Schema.optional(Schema.Boolean),
    parseCompleteness: Schema.Literal('complete', 'incomplete', 'unknown'),
  }),
  fileUri: Schema.String,
});
export type SerializedCompilationSymbolTable = Schema.Schema.Type<
  typeof SerializedCompilationSymbolTable
>;

export const CompilationMetrics = Schema.Struct({
  compileMs: Schema.Number,
  serializeMs: Schema.Number,
  symbolCount: Schema.Number,
  referenceCount: Schema.Number,
  payloadSizeBytes: Schema.Number,
});
export type CompilationMetrics = Schema.Schema.Type<typeof CompilationMetrics>;

export const CompileApexFileSuccess = Schema.Struct({
  uri: Schema.String,
  version: Schema.Number,
  detailLevel: CompilationDetailLevel,
  symbolTable: SerializedCompilationSymbolTable,
  parserDiagnostics: Schema.Array(SerializedParserDiagnostic),
  warnings: Schema.Array(Schema.String),
  metrics: CompilationMetrics,
});
export type CompileApexFileSuccess = Schema.Schema.Type<
  typeof CompileApexFileSuccess
>;

export const CompileApexFileFailure = Schema.Struct({
  _tag: Schema.Literal('CompileApexFileError'),
  uri: Schema.String,
  message: Schema.String,
});
export type CompileApexFileFailure = Schema.Schema.Type<
  typeof CompileApexFileFailure
>;

export class InitializeCompilationWorker extends Schema.TaggedRequest<InitializeCompilationWorker>()(
  'InitializeCompilationWorker',
  {
    success: Schema.Struct({ ready: Schema.Literal(true) }),
    failure: Schema.Struct({
      _tag: Schema.Literal('InitializeCompilationWorkerError'),
      message: Schema.String,
    }),
    payload: {
      logLevel: Schema.optional(Schema.String),
      projectNamespace: Schema.optional(Schema.String),
    },
  },
) {}

export class CompileApexFile extends Schema.TaggedRequest<CompileApexFile>()(
  'CompileApexFile',
  {
    success: CompileApexFileSuccess,
    failure: CompileApexFileFailure,
    payload: {
      uri: Schema.String,
      content: Schema.String,
      languageId: Schema.String,
      version: Schema.Number,
      detailLevel: CompilationDetailLevel,
      collectReferences: Schema.Boolean,
      traceContext: Schema.optional(Schema.String),
    },
  },
) {}

export type CompilationWorkerRequest =
  InitializeCompilationWorker | CompileApexFile;

export const CompilationWorkerRequests = Schema.Union(
  InitializeCompilationWorker,
  CompileApexFile,
);
