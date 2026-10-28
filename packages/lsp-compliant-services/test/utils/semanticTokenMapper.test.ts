/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  collectDeclarationSemanticTokenSpans,
  collectReferenceSemanticTokenSpans,
  encodeSemanticTokenSpans,
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

function collectReferences(
  source: string,
  fileName = 'Example.cls',
): SemanticTokenSpan[] {
  const result = new CompilerService().compile(
    source,
    fileName,
    new FullSymbolCollectorListener(),
  );

  expect(result.result).not.toBeNull();
  return collectReferenceSemanticTokenSpans(
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

describe('reference semantic token mapper', () => {
  it('maps parser-classified method, type, variable, property, and literal leaves', () => {
    const spans = collectReferences(
      [
        'public class Example {',
        '  public void execute() {',
        "    String value = 'text';",
        '    Integer count = 42;',
        '    System.debug(value);',
        '  }',
        '}',
      ].join('\n'),
    );

    expect(spans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tokenType: 'type',
          tokenModifiers: [],
        }),
        expect.objectContaining({
          tokenType: 'method',
          tokenModifiers: [],
        }),
        expect.objectContaining({
          tokenType: 'variable',
          tokenModifiers: [],
        }),
        expect.objectContaining({
          tokenType: 'string',
          tokenModifiers: [],
        }),
        expect.objectContaining({
          tokenType: 'number',
          tokenModifiers: [],
        }),
      ]),
    );
  });

  it('does not classify declaration references', () => {
    const source = [
      'public class Example {',
      '  Integer value;',
      '  public void execute() {',
      '    this.value = 1;',
      '  }',
      '}',
    ].join('\n');
    const spans = collectReferences(source);

    expect(spanAt(spans, 3, 4)).toEqual(
      expect.objectContaining({ tokenType: 'variable' }),
    );
    expect(spanAt(spans, 1, 10)).toBeUndefined();
  });

  it('uses parser-owned leaves for qualified and generic constructor types', () => {
    const source = [
      'public class Example {',
      '  void execute() {',
      '    System.Url url = new System.Url(',
      "      'https://example.com'",
      '    );',
      '    List<String> values = new List<String>();',
      '  }',
      '}',
    ].join('\n');
    const spans = collectReferences(source);

    expect(spanAt(spans, 2, 25)).toEqual({
      start: { line: 2, character: 25 },
      end: { line: 2, character: 31 },
      tokenType: 'namespace',
      tokenModifiers: [],
      precedence: 0,
    });
    expect(spanAt(spans, 2, 32)).toEqual({
      start: { line: 2, character: 32 },
      end: { line: 2, character: 35 },
      tokenType: 'type',
      tokenModifiers: [],
      precedence: 0,
    });
    expect(spanAt(spans, 5, 30)).toEqual({
      start: { line: 5, character: 30 },
      end: { line: 5, character: 34 },
      tokenType: 'type',
      tokenModifiers: [],
      precedence: 0,
    });
    expect(spanAt(spans, 5, 35)).toEqual({
      start: { line: 5, character: 35 },
      end: { line: 5, character: 41 },
      tokenType: 'type',
      tokenModifiers: [],
      precedence: 0,
    });
    expect(spanAt(spans, 2, 19)).toBeUndefined();
    expect(spanAt(spans, 5, 24)).toBeUndefined();
    expect(spanAt(spans, 5, 4)?.end).toEqual({ line: 5, character: 8 });
    expect(
      spans.some(
        (span) =>
          span.start.line === 5 &&
          span.start.character === 4 &&
          span.end.character === 16,
      ),
    ).toBe(false);
  });

  it('encodes qualified constructor leaves without a composite token', () => {
    const spans = collectReferences(
      'class Example { void execute() { new System.Url(); } }',
    );

    expect(encodeSemanticTokenSpans(spans).data).toEqual([
      0, 37, 6, 0, 0, 0, 7, 3, 5, 0,
    ]);
  });
});
