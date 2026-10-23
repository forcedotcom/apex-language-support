/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  collectDeclarationSemanticTokenSpans,
  type SemanticTokenSpan,
} from '../../src';
import {
  CompilerService,
  FullSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';

function collect(
  source: string,
  fileName = 'Example.cls',
): SemanticTokenSpan[] {
  const result = new CompilerService().compile(
    source,
    fileName,
    new FullSymbolCollectorListener(),
  );

  expect(result.result).not.toBeNull();
  return collectDeclarationSemanticTokenSpans(
    result.result!,
    TextDocument.create(`file:///${fileName}`, 'apex', 1, source),
  );
}

function spanAt(
  spans: readonly SemanticTokenSpan[],
  line: number,
  character: number,
): SemanticTokenSpan | undefined {
  return spans.find(
    (span) => span.start.line === line && span.start.character === character,
  );
}

describe('declaration semantic token mapper', () => {
  it('maps parser-owned declaration identifiers and modifiers', () => {
    const source = [
      '@Deprecated',
      'public abstract class Example {',
      '  public static final Integer field = 1;',
      '  @isTest',
      '  private static void method() {',
      "    final String local = 'value';",
      '  }',
      '}',
    ].join('\n');

    const spans = collect(source);

    expect(spans).toEqual(
      expect.arrayContaining([
        {
          start: { line: 0, character: 1 },
          end: { line: 0, character: 11 },
          tokenType: 'decorator',
          tokenModifiers: [],
          precedence: 0,
        },
        {
          start: { line: 1, character: 22 },
          end: { line: 1, character: 29 },
          tokenType: 'class',
          tokenModifiers: ['declaration', 'abstract', 'deprecated'],
          precedence: 0,
        },
        {
          start: { line: 2, character: 30 },
          end: { line: 2, character: 35 },
          tokenType: 'property',
          tokenModifiers: ['declaration', 'readonly', 'static'],
          precedence: 0,
        },
        {
          start: { line: 3, character: 3 },
          end: { line: 3, character: 9 },
          tokenType: 'decorator',
          tokenModifiers: [],
          precedence: 0,
        },
        {
          start: { line: 4, character: 22 },
          end: { line: 4, character: 28 },
          tokenType: 'method',
          tokenModifiers: ['declaration', 'static'],
          precedence: 0,
        },
        {
          start: { line: 5, character: 17 },
          end: { line: 5, character: 22 },
          tokenType: 'variable',
          tokenModifiers: ['declaration', 'readonly'],
          precedence: 0,
        },
      ]),
    );
    expect(spans).not.toContainEqual(
      expect.objectContaining({ tokenType: 'keyword' }),
    );
  });

  it('maps interface methods, parameters, enums, and enum members', () => {
    expect(
      collect('public interface Contract {\n  void execute(String input);\n}'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tokenType: 'interface',
          tokenModifiers: ['declaration'],
        }),
        expect.objectContaining({
          tokenType: 'method',
          tokenModifiers: ['declaration', 'abstract'],
        }),
        expect.objectContaining({
          tokenType: 'parameter',
          tokenModifiers: ['declaration'],
        }),
      ]),
    );
    expect(collect('public enum Choice {\n  FIRST\n}')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tokenType: 'enum',
          tokenModifiers: ['declaration'],
        }),
        expect.objectContaining({
          tokenType: 'enumMember',
          tokenModifiers: ['declaration'],
        }),
      ]),
    );
  });

  it('maps constructor, property, and final parameter declarations', () => {
    const spans = collect(
      [
        'public class Example {',
        '  public String name { get; set; }',
        '  public Example(final String input) {}',
        '}',
      ].join('\n'),
    );

    expect(spans).toEqual(
      expect.arrayContaining([
        {
          start: { line: 1, character: 16 },
          end: { line: 1, character: 20 },
          tokenType: 'property',
          tokenModifiers: ['declaration'],
          precedence: 0,
        },
        {
          start: { line: 2, character: 9 },
          end: { line: 2, character: 16 },
          tokenType: 'method',
          tokenModifiers: ['declaration'],
          precedence: 0,
        },
        {
          start: { line: 2, character: 30 },
          end: { line: 2, character: 35 },
          tokenType: 'parameter',
          tokenModifiers: ['declaration', 'readonly'],
          precedence: 0,
        },
      ]),
    );
  });

  it('uses the parser-owned trigger name range rather than its declaration body', () => {
    const spans = collect(
      [
        'trigger AccountTrigger on Account (before insert) {',
        '  Account record = Trigger.new[0];',
        '}',
      ].join('\n'),
      'AccountTrigger.trigger',
    );

    expect(spanAt(spans, 0, 8)).toEqual({
      start: { line: 0, character: 8 },
      end: { line: 0, character: 22 },
      tokenType: 'class',
      tokenModifiers: ['declaration'],
      precedence: 0,
    });
  });

  it('converts parser columns to UTF-16 positions', () => {
    const spans = collect('/* 😀 */ public class Example {}');

    expect(spanAt(spans, 0, 22)).toEqual({
      start: { line: 0, character: 22 },
      end: { line: 0, character: 29 },
      tokenType: 'class',
      tokenModifiers: ['declaration'],
      precedence: 0,
    });
  });

  it('converts standalone CR parser positions through document offsets', () => {
    const spans = collect('/* comment */\rpublic class Example {}');

    expect(spanAt(spans, 1, 13)).toEqual({
      start: { line: 1, character: 13 },
      end: { line: 1, character: 20 },
      tokenType: 'class',
      tokenModifiers: ['declaration'],
      precedence: 0,
    });
  });
});
