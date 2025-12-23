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
import { ReferenceContext } from '../../src/types/symbolReference';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { URI } from 'vscode-uri';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';

/**
 * Tests that instance member resolution via variable receivers works for hover/definition
 * using the method `testResolveViaVariable` in TestClass.cls.
 *
 * Position convention: 1-based line, 0-based character
 */
describe('ApexSymbolManager receiver-type member resolution', () => {
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
      path.join(__dirname, fileUri || '../fixtures/cross-file/TestClass.cls'),
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

  // TODO: Fix symbol resolution for chained type references
  // The parser correctly captures method calls as CHAINED_TYPE references with chainNodes,
  // but symbol resolution at specific positions within chained expressions needs improvement
  it.skip('resolves request.setEndpoint(...) to HttpRequest.setEndpoint', async () => {
    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/TestClass.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Helper function to extract qualifier from new structure
    const getQualifier = (ref: any): string | undefined => {
      // Check for chainNodes (chained expressions)
      if (ref.chainNodes && ref.chainNodes.length >= 2) {
        return ref.chainNodes[0].name;
      }
      // Check for qualified name (e.g., "request.setEndpoint")
      if (ref.name.includes('.')) {
        const parts = ref.name.split('.');
        return parts.slice(0, -1).join('.');
      }
      return undefined;
    };

    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.CHAINED_TYPE &&
        r.name === 'request.setEndpoint' &&
        getQualifier(r) === 'request',
    );
    expect(target).toBeDefined();
    const symbol = await symbolManager.getSymbolAtPosition(testClassUri, {
      line: target!.location.identifierRange.startLine,
      character: target!.location.identifierRange.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('setEndpoint');
  });

  // TODO: Fix symbol resolution for chained type references
  it.skip('resolves request.setMethod("GET") to HttpRequest.setMethod', async () => {
    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/TestClass.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Helper function to extract qualifier from new structure
    const getQualifier = (ref: any): string | undefined => {
      // Check for chainNodes (chained expressions)
      if (ref.chainNodes && ref.chainNodes.length >= 2) {
        return ref.chainNodes[0].name;
      }
      // Check for qualified name (e.g., "request.setMethod")
      if (ref.name.includes('.')) {
        const parts = ref.name.split('.');
        return parts.slice(0, -1).join('.');
      }
      return undefined;
    };

    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'setMethod' &&
        getQualifier(r) === 'request',
    );
    expect(target).toBeDefined();
    const symbol = await symbolManager.getSymbolAtPosition(testClassUri, {
      line: target!.location.identifierRange.startLine,
      character: target!.location.identifierRange.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('setMethod');
  });

  // TODO: Fix symbol resolution for chained type references
  it.skip('resolves http.send(request) to Http.send', async () => {
    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/TestClass.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Helper function to extract qualifier from new structure
    const getQualifier = (ref: any): string | undefined => {
      // Check for chainNodes (chained expressions)
      if (ref.chainNodes && ref.chainNodes.length >= 2) {
        return ref.chainNodes[0].name;
      }
      // Check for qualified name (e.g., "http.send")
      if (ref.name.includes('.')) {
        const parts = ref.name.split('.');
        return parts.slice(0, -1).join('.');
      }
      return undefined;
    };

    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'send' &&
        getQualifier(r) === 'http',
    );
    expect(target).toBeDefined();
    const symbol = await symbolManager.getSymbolAtPosition(testClassUri, {
      line: target!.location.identifierRange.startLine,
      character: target!.location.identifierRange.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('send');
  });

  // TODO: Fix symbol resolution for chained type references
  it.skip('resolves response.getStatusCode() to HttpResponse.getStatusCode', async () => {
    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/TestClass.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Helper function to extract qualifier from new structure
    const getQualifier = (ref: any): string | undefined => {
      // Check for chainNodes (chained expressions)
      if (ref.chainNodes && ref.chainNodes.length >= 2) {
        return ref.chainNodes[0].name;
      }
      // Check for qualified name (e.g., "response.getStatusCode")
      if (ref.name.includes('.')) {
        const parts = ref.name.split('.');
        return parts.slice(0, -1).join('.');
      }
      return undefined;
    };

    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'getStatusCode' &&
        getQualifier(r) === 'response',
    );
    expect(target).toBeDefined();
    const symbol = await symbolManager.getSymbolAtPosition(testClassUri, {
      line: target!.location.identifierRange.startLine,
      character: target!.location.identifierRange.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('getStatusCode');
  });

  // TODO: Fix symbol resolution for chained type references
  it.skip('resolves response.getBody() to HttpResponse.getBody', async () => {
    const testClassPath = path.resolve(
      path.join(__dirname, '../fixtures/cross-file/TestClass.cls'),
    );
    const testClassUri = URI.file(testClassPath).toString();
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile(testClassUri);

    // Helper function to extract qualifier from new structure
    const getQualifier = (ref: any): string | undefined => {
      // Check for chainNodes (chained expressions)
      if (ref.chainNodes && ref.chainNodes.length >= 2) {
        return ref.chainNodes[0].name;
      }
      // Check for qualified name (e.g., "response.getBody")
      if (ref.name.includes('.')) {
        const parts = ref.name.split('.');
        return parts.slice(0, -1).join('.');
      }
      return undefined;
    };

    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'getBody' &&
        getQualifier(r) === 'response',
    );
    expect(target).toBeDefined();
    const symbol = await symbolManager.getSymbolAtPosition(testClassUri, {
      line: target!.location.identifierRange.startLine,
      character: target!.location.identifierRange.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('getBody');
  });

  it('resolves chained std-class call URL.getOrgDomainUrl().toExternalForm()', async () => {
    const cut = '../fixtures/cross-file/SystemUrl.cls';
    const systemUrlPath = path.resolve(__dirname, cut);
    addTestClass(cut);

    const fileUri = URI.file(systemUrlPath).toString();

    // Get all references in the file
    const refs = symbolManager.getAllReferencesInFile(fileUri);
    // Helper function to extract qualifier from new structure
    const _getQualifier = (ref: any): string | undefined => {
      // Check for chainNodes (chained expressions)
      if (ref.chainNodes && ref.chainNodes.length >= 2) {
        return ref.chainNodes[0].name;
      }
      // Check for qualified name (e.g., "request.setEndpoint")
      if (ref.name.includes('.')) {
        const parts = ref.name.split('.');
        return parts.slice(0, -1).join('.');
      }
      return undefined;
    };

    // Find the chain HEAD reference that contains toExternalForm
    const chainHead = refs.find((r) =>
      (r as any).chainNodes?.some(
        (step: any) => step.name === 'toExternalForm',
      ),
    );
    expect(chainHead).toBeDefined();

    // Extract the specific toExternalForm step from the chain
    const toExternalFormStep = (chainHead as any).chainNodes.find(
      (step: any) => step.name === 'toExternalForm',
    );
    expect(toExternalFormStep).toBeDefined();

    // Use the chained expression reference to resolve the toExternalForm method
    // The chained expression reference contains all the chain nodes
    const target = chainHead;
    expect(target).toBeDefined();
    expect(target?.name).toBe('System.Url.getOrgDomainUrl.toExternalForm');

    // Try to resolve the symbol at the toExternalForm position using the chained expression reference
    // The chained expression reference will use position-based detection to find the specific step
    const sym = await symbolManager.getSymbolAtPosition(
      fileUri,
      {
        line: toExternalFormStep!.location.identifierRange.startLine,
        character: toExternalFormStep!.location.identifierRange.startColumn,
      },
      'precise',
    );
    expect(sym).toBeDefined();
    expect(sym?.kind).toBe(SymbolKind.Method);
    expect(sym?.name).toBe('toExternalForm');
  });
});
