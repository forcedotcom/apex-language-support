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
import { ReferenceContext } from '../../src/types/typeReference';

/**
 * Tests that instance member resolution via variable receivers works for hover/definition
 * using the method `testResolveViaVariable` in TestClass.cls.
 *
 * Position convention: 1-based line, 0-based character
 */
describe('ApexSymbolManager receiver-type member resolution', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const addTestClass = () => {
    const testClassPath = path.join(
      __dirname,
      '../fixtures/cross-file/TestClass.cls',
    );
    const testClassContent = fs.readFileSync(testClassPath, 'utf8');

    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(
      testClassContent,
      '/test/TestClass.cls',
      listener,
    );
    if (result.result) {
      symbolManager.addSymbolTable(result.result, '/test/TestClass.cls');
    }
  };

  it('resolves request.setEndpoint(...) to HttpRequest.setEndpoint', () => {
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile('/test/TestClass.cls');
    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'setEndpoint' &&
        r.qualifier === 'request',
    );
    expect(target).toBeDefined();
    const symbol = symbolManager.getSymbolAtPosition('/test/TestClass.cls', {
      line: target!.location.startLine,
      character: target!.location.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('setEndpoint');
  });

  it('resolves request.setMethod("GET") to HttpRequest.setMethod', () => {
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile('/test/TestClass.cls');
    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'setMethod' &&
        r.qualifier === 'request',
    );
    expect(target).toBeDefined();
    const symbol = symbolManager.getSymbolAtPosition('/test/TestClass.cls', {
      line: target!.location.startLine,
      character: target!.location.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('setMethod');
  });

  it('resolves http.send(request) to Http.send', () => {
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile('/test/TestClass.cls');
    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'send' &&
        r.qualifier === 'http',
    );
    expect(target).toBeDefined();
    const symbol = symbolManager.getSymbolAtPosition('/test/TestClass.cls', {
      line: target!.location.startLine,
      character: target!.location.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('send');
  });

  it('resolves response.getStatusCode() to HttpResponse.getStatusCode', () => {
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile('/test/TestClass.cls');
    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'getStatusCode' &&
        r.qualifier === 'response',
    );
    expect(target).toBeDefined();
    const symbol = symbolManager.getSymbolAtPosition('/test/TestClass.cls', {
      line: target!.location.startLine,
      character: target!.location.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('getStatusCode');
  });

  it('resolves response.getBody() to HttpResponse.getBody', () => {
    addTestClass();
    const refs = symbolManager.getAllReferencesInFile('/test/TestClass.cls');
    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'getBody' &&
        r.qualifier === 'response',
    );
    expect(target).toBeDefined();
    const symbol = symbolManager.getSymbolAtPosition('/test/TestClass.cls', {
      line: target!.location.startLine,
      character: target!.location.startColumn,
    });

    expect(symbol).toBeDefined();
    expect(symbol?.kind).toBe(SymbolKind.Method);
    expect(symbol?.name).toBe('getBody');
  });

  it('resolves chained std-class call URL.getOrgDomainUrl().toExternalForm()', () => {
    addTestClass();
    // Find the toExternalForm reference in the complex method
    const refs = symbolManager.getAllReferencesInFile('/test/TestClass.cls');
    const target = refs.find(
      (r) =>
        r.context === ReferenceContext.METHOD_CALL &&
        r.name === 'toExternalForm',
    );
    expect(target).toBeDefined();
    const sym = symbolManager.getSymbolAtPosition('/test/TestClass.cls', {
      line: target!.location.startLine,
      character: target!.location.startColumn,
    });
    expect(sym).toBeDefined();
    expect(sym?.kind).toBe(SymbolKind.Method);
    expect(sym?.name).toBe('toExternalForm');
  });
});
