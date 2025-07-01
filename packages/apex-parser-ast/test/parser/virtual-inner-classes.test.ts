/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolKind, SymbolTable } from '../../src/types/symbol';
import { ApexError } from '../../src/parser/listeners/ApexErrorListener';
import * as path from 'path';
import * as fs from 'fs';

describe('Virtual Inner Classes Grammar Issue', () => {
  const testFixture = path.join(
    __dirname,
    '../fixtures/virtual-inner-classes.cls',
  );
  const invalidFixture = path.join(
    __dirname,
    '../fixtures/invalid-virtual-field-in-virtual-class.cls',
  );
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  test('demonstrates the grammar parsing issue with virtual inner classes', () => {
    // This test documents the current issue where virtual inner classes
    // are incorrectly parsed due to grammar precedence in the external parser
    const testContent = fs.readFileSync(testFixture, 'utf8');
    const listener = new ApexSymbolCollectorListener();

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      testContent,
      'virtual-inner-classes.cls',
      listener,
    );

    // CURRENT ISSUE: Virtual inner classes are being mis-parsed, causing field errors
    // This should be 0 once the grammar fix is merged in apex-parser
    const fieldErrors = result.errors.filter((error: ApexError) =>
      error.message.includes("Field cannot be declared as 'virtual'"),
    );

    expect(fieldErrors.length).toBe(2); // Current behavior (should be 0 after fix)
  });

  test('shows that inner class symbols are not created due to grammar issue', () => {
    // This test documents that virtual inner classes aren't being parsed as classes
    const testContent = fs.readFileSync(testFixture, 'utf8');
    const listener = new ApexSymbolCollectorListener();

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      testContent,
      'virtual-inner-classes.cls',
      listener,
    );

    const symbolTable = result.result;
    expect(symbolTable).toBeDefined();

    const fileScope = symbolTable?.getCurrentScope();
    expect(fileScope).toBeDefined();

    const allSymbols = fileScope?.getAllSymbols();

    const outerClass = allSymbols?.find(
      (s) => s.name === 'VirtualInnerClassesTest',
    );
    expect(outerClass).toBeDefined();
    expect(outerClass?.kind).toBe(SymbolKind.Class);

    // CURRENT ISSUE: Inner classes are not being created due to grammar parsing
    // This should find inner classes once the grammar fix is merged
    const innerSymbols = allSymbols?.filter(
      (s) => s.parent?.name === 'VirtualInnerClassesTest',
    );

    // Currently 0 due to grammar issue (should be > 0 after fix)
    expect(innerSymbols?.length).toBe(0);
  });

  test('correctly catches virtual field errors (validation still works)', () => {
    // This test verifies that field validation still works correctly
    // for actual invalid virtual fields
    const testContent = fs.readFileSync(invalidFixture, 'utf8');
    const listener = new ApexSymbolCollectorListener();

    const result: CompilationResult<SymbolTable> = compilerService.compile(
      testContent,
      'invalid-virtual-field-in-virtual-class.cls',
      listener,
    );

    // Should have errors for the virtual fields
    const virtualFieldErrors = result.errors.filter((error: ApexError) =>
      error.message.includes("Field cannot be declared as 'virtual'"),
    );

    // We expect 2 errors for the actual invalid virtual fields
    expect(virtualFieldErrors.length).toBe(2);

    // Verify the error messages are about fields
    virtualFieldErrors.forEach((error) => {
      expect(error.message).toContain('Field cannot be declared as');
    });
  });
});
