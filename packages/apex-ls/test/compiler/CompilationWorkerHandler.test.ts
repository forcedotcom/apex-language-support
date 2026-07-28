/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Schema } from 'effect';
import {
  CompileApexFile,
  CompileApexFileSuccess,
  InitializeCompilationWorker,
} from '@salesforce/apex-lsp-shared';
import {
  createCompilationWorkerHandlers,
  reconstructCompiledSymbolTable,
} from '../../src/compiler/CompilationWorkerHandler';

const URI = 'file:///workspace/WorkerFixture.cls';
const SOURCE = `public class WorkerFixture {
  public String visibleMethod() { return 'visible'; }
  private String privateMethod() { return 'private'; }
}`;

describe('CompilationWorkerHandler', () => {
  it('initializes a reusable compiler service', async () => {
    const handlers = createCompilationWorkerHandlers();
    const result = await Effect.runPromise(
      handlers.InitializeCompilationWorker(
        new InitializeCompilationWorker({ projectNamespace: 'example' }),
      ),
    );

    expect(result).toEqual({ ready: true });
  });

  it('compiles public API into a schema-valid pure-data result', async () => {
    const handlers = createCompilationWorkerHandlers();
    const result = await Effect.runPromise(
      handlers.CompileApexFile(
        new CompileApexFile({
          uri: URI,
          content: SOURCE,
          languageId: 'apex',
          version: 4,
          detailLevel: 'public-api',
          collectReferences: true,
        }),
      ),
    );

    expect(() =>
      Schema.decodeSync(CompileApexFileSuccess)(result),
    ).not.toThrow();
    expect(result.uri).toBe(URI);
    expect(result.version).toBe(4);
    expect(result.symbolTable.metadata.documentVersion).toBe(4);
    expect(result.symbolTable.metadata.hasErrors).toBe(false);
    expect(result.metrics.symbolCount).toBeGreaterThan(0);
    expect(result.metrics.payloadSizeBytes).toBeGreaterThan(0);
    expect(
      result.symbolTable.symbols.every(
        (symbol) => typeof symbol === 'object' && symbol !== null,
      ),
    ).toBe(true);
  });

  it('reconstructs an indexed SymbolTable from the wire result', async () => {
    const handlers = createCompilationWorkerHandlers();
    const result = await Effect.runPromise(
      handlers.CompileApexFile(
        new CompileApexFile({
          uri: URI,
          content: SOURCE,
          languageId: 'apex',
          version: 5,
          detailLevel: 'full',
          collectReferences: true,
        }),
      ),
    );

    const table = reconstructCompiledSymbolTable(result);
    const names = table.getAllSymbols().map((symbol) => symbol.name);

    expect(table.getFileUri()).toBe(URI);
    expect(table.getMetadata().documentVersion).toBe(5);
    expect(names).toContain('WorkerFixture');
    expect(names).toContain('visibleMethod');
    expect(names).toContain('privateMethod');
    expect(table.getAllReferences().length).toBe(result.metrics.referenceCount);
  });

  it('returns parser diagnostics as data without failing the worker request', async () => {
    const handlers = createCompilationWorkerHandlers();
    const result = await Effect.runPromise(
      handlers.CompileApexFile(
        new CompileApexFile({
          uri: URI,
          content: 'public class WorkerFixture { public void broken( }',
          languageId: 'apex',
          version: 6,
          detailLevel: 'public-api',
          collectReferences: true,
        }),
      ),
    );

    expect(result.parserDiagnostics.length).toBeGreaterThan(0);
    expect(result.symbolTable.metadata.hasErrors).toBe(true);
  });
});
