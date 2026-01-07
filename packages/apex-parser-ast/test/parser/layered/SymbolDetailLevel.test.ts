/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
  SymbolFactory,
  SymbolLocation,
} from '../../../src/types/symbol';
import { TestLogger } from '../../utils/testLogger';

describe('Symbol Detail Level Tracking', () => {
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.setLogLevel('error');
  });

  it('should track detail level on symbols', () => {
    const symbolTable = new SymbolTable();
    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
    };

    const fieldSymbol = SymbolFactory.createFullSymbolWithNamespace(
      'testField',
      SymbolKind.Field,
      location,
      'file://test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      undefined,
      null,
      [],
      [],
    );

    // Set detail level
    fieldSymbol._detailLevel = 'public-api';

    symbolTable.addSymbol(fieldSymbol, null);

    const allSymbols = symbolTable.getAllSymbols();
    const retrieved = allSymbols.find((s) => s.id === fieldSymbol.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?._detailLevel).toBe('public-api');
  });

  it('should enrich symbols with higher detail levels', () => {
    const symbolTable = new SymbolTable();
    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
    };

    // Add symbol with public-api detail level
    const fieldSymbol1 = SymbolFactory.createFullSymbolWithNamespace(
      'testField',
      SymbolKind.Field,
      location,
      'file://test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      undefined,
      null,
      [],
      [],
    );
    fieldSymbol1._detailLevel = 'public-api';
    symbolTable.addSymbol(fieldSymbol1, null);

    const id1 = fieldSymbol1.id;

    // Try to add same symbol with protected detail level (higher)
    const fieldSymbol2 = SymbolFactory.createFullSymbolWithNamespace(
      'testField',
      SymbolKind.Field,
      location,
      'file://test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      undefined,
      null,
      [],
      [],
    );
    fieldSymbol2._detailLevel = 'protected';

    symbolTable.addSymbol(fieldSymbol2, null);

    const allSymbols = symbolTable.getAllSymbols();
    const retrieved = allSymbols.find((s) => s.id === id1);
    expect(retrieved).toBeDefined();
    // Should be enriched to protected level
    expect(retrieved?._detailLevel).toBe('protected');
    // Should be same symbol (same ID)
    expect(retrieved?.id).toBe(id1);
  });

  it('should not replace symbols with lower detail levels', () => {
    const symbolTable = new SymbolTable();
    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
    };

    // Add symbol with protected detail level
    const fieldSymbol1 = SymbolFactory.createFullSymbolWithNamespace(
      'testField',
      SymbolKind.Field,
      location,
      'file://test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      undefined,
      null,
      [],
      [],
    );
    fieldSymbol1._detailLevel = 'protected';
    symbolTable.addSymbol(fieldSymbol1, null);

    const id1 = fieldSymbol1.id;
    const detailLevel1 = fieldSymbol1._detailLevel;

    // Try to add same symbol with public-api detail level (lower)
    const fieldSymbol2 = SymbolFactory.createFullSymbolWithNamespace(
      'testField',
      SymbolKind.Field,
      location,
      'file://test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      undefined,
      null,
      [],
      [],
    );
    fieldSymbol2._detailLevel = 'public-api';

    symbolTable.addSymbol(fieldSymbol2, null);

    const allSymbols = symbolTable.getAllSymbols();
    const retrieved = allSymbols.find((s) => s.id === id1);
    expect(retrieved).toBeDefined();
    // Should keep original detail level (protected)
    expect(retrieved?._detailLevel).toBe(detailLevel1);
    expect(retrieved?._detailLevel).toBe('protected');
  });

  it('should not replace symbols with same detail level', () => {
    const symbolTable = new SymbolTable();
    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
    };

    // Add symbol with public-api detail level
    const fieldSymbol1 = SymbolFactory.createFullSymbolWithNamespace(
      'testField',
      SymbolKind.Field,
      location,
      'file://test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      undefined,
      null,
      [],
      [],
    );
    fieldSymbol1._detailLevel = 'public-api';
    symbolTable.addSymbol(fieldSymbol1, null);

    const id1 = fieldSymbol1.id;

    // Try to add same symbol with same detail level
    const fieldSymbol2 = SymbolFactory.createFullSymbolWithNamespace(
      'testField',
      SymbolKind.Field,
      location,
      'file://test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      undefined,
      null,
      [],
      [],
    );
    fieldSymbol2._detailLevel = 'public-api';

    symbolTable.addSymbol(fieldSymbol2, null);

    const allSymbols = symbolTable.getAllSymbols();
    const retrieved = allSymbols.find((s) => s.id === id1);
    expect(retrieved).toBeDefined();
    // Should keep original symbol
    expect(retrieved?.id).toBe(id1);
    expect(retrieved?._detailLevel).toBe('public-api');
  });
});
