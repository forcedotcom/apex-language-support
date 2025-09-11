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
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolManager.getSymbolAtPosition', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    // Enable console logging with debug level for tests
    enableConsoleLogging();
    setLogLevel('error');

    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('same-file symbol resolution', () => {
    it('should find a method symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClass.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClass.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Test finding the method symbol at its position (line 2, character 20)
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: 2, character: 20 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('method');
      expect(foundSymbol?.name).toBe('myMethod');
    });

    it('should find a field symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassWithField.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassWithField.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassWithField.cls',
        );
      }

      // Test finding the field symbol at its position
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassWithField.cls',
        { line: 2, character: 20 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('field');
      expect(foundSymbol?.name).toBe('testField');
    });

    it('should find a class symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassSimple.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassSimple.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassSimple.cls',
        );
      }

      // Test finding the class symbol at its position
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassSimple.cls',
        { line: 1, character: 13 }, // Class name position (within the class bounds)
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('class');
      expect(foundSymbol?.name).toBe('TestClassSimple');
    });

    it('should find a variable symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassWithVariable.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassWithVariable.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassWithVariable.cls',
        );
      }

      // Test finding the variable symbol at its position
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassWithVariable.cls',
        { line: 3, character: 15 }, // Variable position (within the variable name range)
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('variable');
      expect(foundSymbol?.name).toBe('test');
    });

    it('should prioritize more specific symbols when overlapping', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassOverlapping.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassOverlapping.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassOverlapping.cls',
        );
      }

      // Test finding the method symbol at its position (should prioritize method over class)
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassOverlapping.cls',
        { line: 2, character: 16 }, // Method position
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('method');
      expect(foundSymbol?.name).toBe('myMethod');
    });
  });
});
