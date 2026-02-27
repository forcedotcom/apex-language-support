/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { CompilerService } from '../../src/parser/compilerService';
import { VisibilitySymbolListener } from '../../src/parser/listeners/VisibilitySymbolListener';
import { SymbolTable } from '../../src/types/symbol';
import { ErrorCodes } from '../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

const loadFixture = (category: string, filename: string): string => {
  const fixturePath = path.join(
    __dirname,
    '../fixtures/validation',
    category,
    filename,
  );
  return fs.readFileSync(fixturePath, 'utf8');
};

describe('SyntaxErrorReporting', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  const SYNTAX_ERROR_CATEGORY = 'syntax-error';

  it('should report MISSING_SYNTAX for missing semicolon', () => {
    const content = loadFixture(SYNTAX_ERROR_CATEGORY, 'MissingSemicolon.cls');
    const result = compilerService.compile(
      content,
      'MissingSemicolon.cls',
      new VisibilitySymbolListener('public-api', new SymbolTable()),
    );

    const syntaxErrors = result.errors.filter((e) => e.type === 'syntax');
    expect(syntaxErrors.length).toBeGreaterThan(0);
    const hasMissingSyntax = syntaxErrors.some(
      (e) => e.code === ErrorCodes.MISSING_SYNTAX,
    );
    expect(hasMissingSyntax).toBe(true);
  });

  it('should report syntax error with code for MismatchedSyntax fixture', () => {
    const content = loadFixture(SYNTAX_ERROR_CATEGORY, 'MismatchedSyntax.cls');
    const result = compilerService.compile(
      content,
      'MismatchedSyntax.cls',
      new VisibilitySymbolListener('public-api', new SymbolTable()),
    );

    const syntaxErrors = result.errors.filter((e) => e.type === 'syntax');
    expect(syntaxErrors.length).toBeGreaterThan(0);
    expect(syntaxErrors[0].code).toBeDefined();
    const expectedCodes = [
      ErrorCodes.MISMATCHED_SYNTAX,
      ErrorCodes.MISSING_SYNTAX,
      ErrorCodes.UNEXPECTED_SYNTAX_ERROR,
    ];
    expect(expectedCodes).toContain(syntaxErrors[0].code);
  });

  it('should report syntax error with code for truncated file', () => {
    const content = loadFixture(SYNTAX_ERROR_CATEGORY, 'UnexpectedEof.cls');
    const result = compilerService.compile(
      content,
      'UnexpectedEof.cls',
      new VisibilitySymbolListener('public-api', new SymbolTable()),
    );

    const syntaxErrors = result.errors.filter((e) => e.type === 'syntax');
    expect(syntaxErrors.length).toBeGreaterThan(0);
    expect(syntaxErrors[0].code).toBeDefined();
  });

  it('should report MISSING_CLOSING_QUOTE for unclosed string', () => {
    const content = loadFixture(
      SYNTAX_ERROR_CATEGORY,
      'MissingClosingQuote.cls',
    );
    const result = compilerService.compile(
      content,
      'MissingClosingQuote.cls',
      new VisibilitySymbolListener('public-api', new SymbolTable()),
    );

    const syntaxErrors = result.errors.filter((e) => e.type === 'syntax');
    expect(syntaxErrors.length).toBeGreaterThan(0);
    const hasQuote = syntaxErrors.some(
      (e) =>
        e.code === ErrorCodes.MISSING_CLOSING_QUOTE ||
        e.code === ErrorCodes.UNEXPECTED_SYNTAX_ERROR,
    );
    expect(hasQuote).toBe(true);
  });

  it('should report syntax error with code for unclosed comment', () => {
    const content = loadFixture(
      SYNTAX_ERROR_CATEGORY,
      'MissingClosingMark.cls',
    );
    const result = compilerService.compile(
      content,
      'MissingClosingMark.cls',
      new VisibilitySymbolListener('public-api', new SymbolTable()),
    );

    const syntaxErrors = result.errors.filter((e) => e.type === 'syntax');
    expect(syntaxErrors.length).toBeGreaterThan(0);
    expect(syntaxErrors[0].code).toBeDefined();
  });

  it('should report syntax error with code for UnmatchedSyntax fixture', () => {
    const content = loadFixture(SYNTAX_ERROR_CATEGORY, 'UnmatchedSyntax.cls');
    const result = compilerService.compile(
      content,
      'UnmatchedSyntax.cls',
      new VisibilitySymbolListener('public-api', new SymbolTable()),
    );

    const syntaxErrors = result.errors.filter((e) => e.type === 'syntax');
    expect(syntaxErrors.length).toBeGreaterThan(0);
    expect(syntaxErrors[0].code).toBeDefined();
  });

  it('should report syntax error with code for UnexpectedToken fixture', () => {
    const content = loadFixture(SYNTAX_ERROR_CATEGORY, 'UnexpectedToken.cls');
    const result = compilerService.compile(
      content,
      'UnexpectedToken.cls',
      new VisibilitySymbolListener('public-api', new SymbolTable()),
    );

    const syntaxErrors = result.errors.filter((e) => e.type === 'syntax');
    expect(syntaxErrors.length).toBeGreaterThan(0);
    expect(syntaxErrors[0].code).toBeDefined();
  });
});
