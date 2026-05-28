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
import { Effect } from 'effect';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { CompletionContext } from '../../../src/services/CompletionProcessingService';

const FIXTURES_DIR = join(__dirname, '../../fixtures/classes');

export function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf8');
}

export async function compileAndRegister(
  symbolManager: ApexSymbolManager,
  filename: string,
  uri?: string,
): Promise<void> {
  const content = loadFixture(filename);
  const fileUri = uri ?? `file:///test/${filename.replace('.cls', '')}.cls`;
  const compilerService = new CompilerService();
  const symbolTable = new SymbolTable();
  const listener = new FullSymbolCollectorListener(symbolTable);
  compilerService.compile(content, fileUri, listener);
  await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, fileUri));
}

export async function compileInlineAndRegister(
  symbolManager: ApexSymbolManager,
  content: string,
  uri: string,
): Promise<void> {
  const compilerService = new CompilerService();
  const symbolTable = new SymbolTable();
  const listener = new FullSymbolCollectorListener(symbolTable);
  compilerService.compile(content, uri, listener);
  await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));
}

export function makeTextDocument(content: string, uri: string): TextDocument {
  return TextDocument.create(uri, 'apex', 1, content);
}

export function makeCompletionContext(
  document: TextDocument,
  line: number,
  character: number,
  overrides?: Partial<CompletionContext>,
): CompletionContext {
  return {
    document,
    position: { line, character },
    triggerCharacter: overrides?.triggerCharacter,
    currentScope: overrides?.currentScope ?? '',
    importStatements: overrides?.importStatements ?? [],
    namespaceContext: overrides?.namespaceContext ?? '',
    expectedType: overrides?.expectedType,
    isStatic: overrides?.isStatic ?? false,
    accessModifier: overrides?.accessModifier ?? 'public',
  };
}
