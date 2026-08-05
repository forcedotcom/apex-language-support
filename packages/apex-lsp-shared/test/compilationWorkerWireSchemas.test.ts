/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Schema } from 'effect';
import {
  CompileApexFile,
  CompileApexFileSuccess,
  InitializeCompilationWorker,
} from '../src/compilationWorkerWireSchemas';

describe('compilationWorkerWireSchemas', () => {
  it('round-trips compilation worker initialization', () => {
    const request = new InitializeCompilationWorker({
      logLevel: 'error',
      projectNamespace: 'example',
    });

    const encoded = Schema.encodeSync(InitializeCompilationWorker)(request);
    const decoded = Schema.decodeSync(InitializeCompilationWorker)(encoded);

    expect(decoded._tag).toBe('InitializeCompilationWorker');
    expect(decoded.projectNamespace).toBe('example');
  });

  it('round-trips a portable single-file compile request', () => {
    const request = new CompileApexFile({
      uri: 'file:///workspace/Example.cls',
      content: 'public class Example {}',
      languageId: 'apex',
      version: 7,
      detailLevel: 'public-api',
      collectReferences: true,
      traceContext: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    });

    const encoded = Schema.encodeSync(CompileApexFile)(request);
    const decoded = Schema.decodeSync(CompileApexFile)(encoded);

    expect(decoded._tag).toBe('CompileApexFile');
    expect(decoded.uri).toBe('file:///workspace/Example.cls');
    expect(decoded.version).toBe(7);
    expect(decoded.detailLevel).toBe('public-api');
  });

  it('validates the explicit compilation result envelope', () => {
    const result = {
      uri: 'file:///workspace/Example.cls',
      version: 7,
      detailLevel: 'public-api' as const,
      symbolTable: {
        symbols: [],
        references: [],
        hierarchicalReferences: [],
        metadata: {
          fileUri: 'file:///workspace/Example.cls',
          documentVersion: 7,
          hasErrors: false,
          parseCompleteness: 'complete' as const,
        },
        fileUri: 'file:///workspace/Example.cls',
      },
      parserDiagnostics: [],
      warnings: [],
      metrics: {
        compileMs: 1,
        serializeMs: 1,
        symbolCount: 0,
        referenceCount: 0,
        payloadSizeBytes: 100,
      },
    };

    const encoded = Schema.encodeSync(CompileApexFileSuccess)(result);
    const decoded = Schema.decodeSync(CompileApexFileSuccess)(encoded);

    expect(decoded.symbolTable.metadata.documentVersion).toBe(7);
    expect(decoded.metrics.payloadSizeBytes).toBe(100);
  });

  it('rejects unsupported compilation detail levels', () => {
    expect(() =>
      Schema.decodeUnknownSync(CompileApexFile)({
        _tag: 'CompileApexFile',
        uri: 'file:///workspace/Example.cls',
        content: 'public class Example {}',
        languageId: 'apex',
        version: 1,
        detailLevel: 'protected',
        collectReferences: true,
      }),
    ).toThrow();
  });
});
