/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import {
  ApexSettingsManager,
  getLogger,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolManager,
  ApexSymbolProcessingManager,
  ResourceLoader,
} from '@salesforce/apex-lsp-parser-ast';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { DiagnosticProcessingService } from '../../src/services/DiagnosticProcessingService';
import { DocumentSymbolProcessingService } from '../../src/services/DocumentSymbolProcessingService';
import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { LayerEnrichmentService } from '../../src/services/LayerEnrichmentService';
import { cleanupTestResources } from '../helpers/test-cleanup';

jest.mock('../../src/storage/ApexStorageManager');
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    ApexSettingsManager: {
      getInstance: jest.fn(),
    },
  };
});

describe('Geocoding diagnostics + documentSymbol perf', () => {
  const geocodingFixturesDir = join(
    __dirname,
    '../../../apex-parser-ast/test/fixtures/validation/geocoding',
  );
  const geocodingTestUri = 'file:///workspace/GeocodingServiceTest.cls';
  const geocodingUri = 'file:///workspace/GeocodingService.cls';
  const isCI = process.env.CI === 'true';
  const iterations = isCI ? 2 : 1;

  let symbolManager: ApexSymbolManager;
  let diagnosticsService: DiagnosticProcessingService;
  let docSymbolService: DocumentSymbolProcessingService;
  let docOpenService: DocumentProcessingService;
  let mockStorage: { getDocument: jest.Mock; setDocument: jest.Mock };

  beforeAll(async () => {
    setLogLevel('error');
    const loader = ResourceLoader.getInstance();
    await loader.initialize();
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    const logger = getLogger();
    const geocodingTestContent = readFileSync(
      join(geocodingFixturesDir, 'GeocodingServiceTest.cls'),
      'utf8',
    );
    const geocodingContent = readFileSync(
      join(geocodingFixturesDir, 'GeocodingService.cls'),
      'utf8',
    );
    const docsByUri = new Map([
      [
        geocodingTestUri,
        TextDocument.create(geocodingTestUri, 'apex', 1, geocodingTestContent),
      ],
      [
        geocodingUri,
        TextDocument.create(geocodingUri, 'apex', 1, geocodingContent),
      ],
    ]);

    mockStorage = {
      getDocument: jest
        .fn()
        .mockImplementation(async (uri: string) => docsByUri.get(uri) ?? null),
      setDocument: jest
        .fn()
        .mockImplementation(async (uri: string, doc: TextDocument) => {
          docsByUri.set(uri, doc);
        }),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue({
      getSettings: jest.fn().mockReturnValue({
        apex: {
          findMissingArtifact: {
            enabled: false,
          },
        },
      }),
      getCompilationOptions: jest.fn().mockReturnValue({
        collectReferences: true,
        resolveReferences: true,
      }),
    });
    diagnosticsService = new DiagnosticProcessingService(logger, symbolManager);
    const processingManager = ApexSymbolProcessingManager.getInstance();
    // @ts-expect-error - test wiring to force shared symbol manager instance
    processingManager.symbolManager = symbolManager;
    docSymbolService = new DocumentSymbolProcessingService(
      logger,
      symbolManager,
    );
    docOpenService = new DocumentProcessingService(logger);
    docSymbolService.setLayerEnrichmentService(
      new LayerEnrichmentService(logger, symbolManager),
    );
    docOpenService.setLayerEnrichmentService(
      new LayerEnrichmentService(logger, symbolManager),
    );
  });

  afterEach(async () => {
    await cleanupTestResources();
  });

  it('measures diagnostics/documentSymbol rounds using geocoding fixtures', async () => {
    const rounds: Array<{
      round: number;
      docSymbolMs: number;
      diagnosticsMs: number;
    }> = [];

    for (let i = 0; i < iterations; i++) {
      const docStart = Date.now();
      await docSymbolService.processDocumentSymbol({
        textDocument: { uri: geocodingTestUri },
      });
      const docSymbolMs = Date.now() - docStart;

      const diagStart = Date.now();
      await diagnosticsService.processDiagnostic({
        textDocument: { uri: geocodingTestUri },
      });
      const diagnosticsMs = Date.now() - diagStart;

      rounds.push({
        round: i + 1,
        docSymbolMs,
        diagnosticsMs,
      });
    }

    // Also drive the source class directly so instrumentation can validate
    // compileLayered symbolTable contents for GeocodingService.cls.
    const sourceDocument = await mockStorage.getDocument(geocodingUri);
    const sourceDidOpenStart = Date.now();
    if (sourceDocument) {
      const sourceOpenEvent: TextDocumentChangeEvent<TextDocument> = {
        document: sourceDocument,
      };
      await docOpenService.processDocumentOpenInternal(sourceOpenEvent);
    }
    const sourceDidOpenMs = Date.now() - sourceDidOpenStart;

    const sourceDocStart = Date.now();
    await docSymbolService.processDocumentSymbol({
      textDocument: { uri: geocodingUri },
    });
    const sourceDocSymbolMs = Date.now() - sourceDocStart;

    const sourceDiagStart = Date.now();
    await diagnosticsService.processDiagnostic({
      textDocument: { uri: geocodingUri },
    });
    const sourceDiagnosticsMs = Date.now() - sourceDiagStart;

    // Keep this as a diagnostic benchmark test: assert execution and emit timings.
    expect(rounds.length).toBe(iterations);
    expect(mockStorage.getDocument).toHaveBeenCalled();

    console.log(
      JSON.stringify(
        {
          benchmark: 'geocoding-diagnostics-docsymbol',
          iterations,
          rounds,
          sourceRound: {
            uri: geocodingUri,
            didOpenMs: sourceDidOpenMs,
            docSymbolMs: sourceDocSymbolMs,
            diagnosticsMs: sourceDiagnosticsMs,
          },
        },
        null,
        2,
      ),
    );
  }, 120000);
});
