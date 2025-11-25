/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolKind } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { URI } from 'vscode-uri';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';

/**
 * Tests that System.URL chained expression resolution works correctly
 * using real source code and the compiler service.
 *
 * Position convention: 1-based line, 0-based character
 */
describe('ApexSymbolManager System URL Chained Expression Resolution (Real Source)', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeAll(async () => {
    // Initialize ResourceLoader with StandardApexLibrary.zip for standard library resolution
    await initializeResourceLoaderForTests({ loadMode: 'lazy' });
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  afterAll(() => {
    resetResourceLoader();
  });

  const addTestClass = (fileUri?: string) => {
    const testClassPath = path.resolve(
      path.join(__dirname, fileUri || '../fixtures/cross-file/SystemUrl.cls'),
    );

    const testClassUri = URI.file(testClassPath).toString();
    const testClassContent = fs.readFileSync(testClassPath, 'utf8');

    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(
      testClassContent,
      testClassUri,
      listener,
    );
    if (result.result) {
      symbolManager.addSymbolTable(result.result, testClassUri);
    }
  };

  it('should resolve System.URL.getOrgDomainUrl().toExternalForm() chained expression', async () => {
    addTestClass();

    // Get all references in the file
    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/SystemUrl.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Find the chained expression reference directly
    const target = refs.find(
      (r) => r.name === 'System.Url.getOrgDomainUrl.toExternalForm',
    );

    expect(target).toBeDefined();

    // Find the specific chain node for "toExternalForm" to get its position
    const chainedRef = target as any;
    const toExternalFormNode = chainedRef.chainNodes?.find(
      (node: any) => node.name === 'toExternalForm',
    );

    expect(toExternalFormNode).toBeDefined();

    // Test the resolution at the toExternalForm position (not the start of the chain)
    const symbol = await symbolManager.getSymbolAtPosition(testClassUri, {
      line: toExternalFormNode!.location.identifierRange.startLine,
      character: toExternalFormNode!.location.identifierRange.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('toExternalForm');
  });

  it('should resolve System.Url.getOrgDomainUrl().toExternalForm method call', async () => {
    addTestClass();

    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/SystemUrl.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Find the chained expression that contains getOrgDomainUrl
    const target = refs.find(
      (r) => r.name === 'System.Url.getOrgDomainUrl.toExternalForm',
    );

    expect(target).toBeDefined();

    // Test resolution of the chained expression
    const symbol = await symbolManager.resolveChainedTypeReference(target!);

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('toExternalForm');
  });

  it('should resolve System.Url as chained type reference', async () => {
    addTestClass();

    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/SystemUrl.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Find the System.Url chained reference
    const target = refs.find((r) => r.name === 'System.Url');

    expect(target).toBeDefined();
    expect(target?.context).toBe(11); // CHAINED_TYPE context

    // When hovering on the start of "System.Url" (which is "System"),
    // we should get the System class, not Url
    const symbolAtSystem = await symbolManager.getSymbolAtPosition(
      testClassUri,
      {
        line: target!.location.identifierRange.startLine,
        character: target!.location.identifierRange.startColumn,
      },
    );

    expect(symbolAtSystem).toBeDefined();
    expect(symbolAtSystem?.kind).toBe(SymbolKind.Class);
    // When hovering on "System", we get the System class
    expect(symbolAtSystem?.name).toBe('System');

    // To get the Url class, we need to resolve the entire chain without position
    // or hover on the "Url" part specifically
    const urlSymbol = await symbolManager.resolveChainedTypeReference(target!);
    expect(urlSymbol).toBeDefined();
    expect(urlSymbol?.kind).toBe(SymbolKind.Class);
    expect(urlSymbol?.name).toBe('Url');
  });
});
