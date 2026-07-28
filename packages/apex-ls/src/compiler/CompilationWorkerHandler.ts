/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  CompileApexFile,
  type CompileApexFileFailure,
  type CompileApexFileSuccess,
  InitializeCompilationWorker,
  type SerializedCompilationSymbolTable,
} from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  VisibilitySymbolListener,
  type SerializedSymbolTableData,
} from '@salesforce/apex-lsp-parser-ast';

type Clock = () => number;

export interface CompilationWorkerHandlerOptions {
  readonly now?: Clock;
}

/**
 * Reconstruct a parser SymbolTable from a successful compilation-worker result.
 * Graph insertion remains a data-owner responsibility.
 */
export function reconstructCompiledSymbolTable(
  result: CompileApexFileSuccess,
): SymbolTable {
  return SymbolTable.fromSerializedData(
    result.symbolTable as SerializedSymbolTableData,
  );
}

/**
 * Create stateful handlers for one compilation worker.
 *
 * The CompilerService is retained across requests so a persistent Effect Worker
 * stays warm. Calling InitializeCompilationWorker replaces it with one carrying
 * the requested project namespace.
 */
export function createCompilationWorkerHandlers(
  options: CompilationWorkerHandlerOptions = {},
) {
  const now = options.now ?? (() => performance.now());
  let compilerService = new CompilerService();

  return {
    InitializeCompilationWorker: (request: InitializeCompilationWorker) =>
      Effect.sync(() => {
        compilerService = new CompilerService(request.projectNamespace);
        return { ready: true as const };
      }),

    CompileApexFile: (request: CompileApexFile) =>
      Effect.try({
        try: (): CompileApexFileSuccess => {
          const compileStartedAt = now();
          const table = new SymbolTable();
          const listener =
            request.detailLevel === 'full'
              ? new FullSymbolCollectorListener(table)
              : new VisibilitySymbolListener('public-api', table);

          const compilation = compilerService.compile(
            request.content,
            request.uri,
            listener,
            {
              collectReferences: request.collectReferences,
              resolveReferences: request.collectReferences,
              includeComments: false,
            },
          );
          const compileMs = now() - compileStartedAt;

          if (!(compilation.result instanceof SymbolTable)) {
            throw new Error(
              compilation.errors[0]?.message ??
                `Compilation did not produce a SymbolTable for ${request.uri}`,
            );
          }

          const symbolTable = compilation.result;
          symbolTable.setMetadata({
            fileUri: request.uri,
            documentVersion: request.version,
            hasErrors: compilation.errors.length > 0,
          });

          const serializeStartedAt = now();
          const wireTable: SerializedCompilationSymbolTable = {
            symbols: symbolTable.getAllSymbols(),
            references: symbolTable.getAllReferences(),
            hierarchicalReferences: symbolTable.getAllHierarchicalReferences(),
            metadata: symbolTable.getMetadata(),
            fileUri: symbolTable.getFileUri(),
          };

          // Force the same pure-data boundary that postMessage will apply and
          // measure its payload independently from compilation.
          const serialized = JSON.stringify(wireTable);
          const clonedTable = JSON.parse(
            serialized,
          ) as SerializedCompilationSymbolTable;
          const serializeMs = now() - serializeStartedAt;

          return {
            uri: request.uri,
            version: request.version,
            detailLevel: request.detailLevel,
            symbolTable: clonedTable,
            parserDiagnostics: compilation.errors,
            warnings: compilation.warnings,
            metrics: {
              compileMs,
              serializeMs,
              symbolCount: clonedTable.symbols.length,
              referenceCount: clonedTable.references.length,
              payloadSizeBytes: new TextEncoder().encode(serialized).byteLength,
            },
          };
        },
        catch: (error): CompileApexFileFailure => ({
          _tag: 'CompileApexFileError',
          uri: request.uri,
          message: error instanceof Error ? error.message : String(error),
        }),
      }),
  };
}

export type CompilationWorkerHandlers = ReturnType<
  typeof createCompilationWorkerHandlers
>;
