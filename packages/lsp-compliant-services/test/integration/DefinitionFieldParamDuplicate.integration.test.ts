/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Regression: go-to-definition on a field must return a SINGLE location so VS
 * Code jumps rather than opening a peek (W-23408848). Two distinct duplicate
 * sources produced extra locations for a plain field:
 *
 *   1. Field vs. same-named constructor parameter. The parser derives a
 *      symbol's unifiedId from its scope path, and a constructor's scope name
 *      equals the enclosing class name, so a class field and a same-named
 *      constructor parameter collapse onto one unifiedId
 *      (`<file>#block.<Class>.<name>`). The duplicate grouping keyed only on
 *      unifiedId returned both — a field AND a parameter. Fixed by also
 *      matching on kind (a genuine duplicate declaration is always the same
 *      kind; a field and a parameter never are).
 *
 *   2. Layered compilation artifacts. The pool worker loads the file at
 *      public-api detail then recompiles it at full detail; the two passes can
 *      leave two same-kind field entries on the SAME line — one anchored to the
 *      identifier, one to the type token. Fixed by collapsing definition
 *      locations that share a (uri, line): a real duplicate declaration lives
 *      on its own line.
 *
 * Both broke the "navigate to field definition" e2e (multiple locations → peek
 * → the harness escapes the peek → cursor never moves).
 */

import { DefinitionParams } from 'vscode-languageserver-protocol';

import { DefinitionProcessingService } from '../../src/services/DefinitionProcessingService';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolKind,
  VisibilitySymbolListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import {
  enableConsoleLogging,
  setLogLevel,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const URI = 'file:///ApexClassExample.cls';
// A class field shadowed by a same-named constructor parameter — the exact
// shape that collapses onto one unifiedId in the parser.
const SRC = `public class ApexClassExample {
    private String instanceId;

    public ApexClassExample(String instanceId) {
        if (String.isBlank(instanceId)) {
            instanceId = 'default';
        }
        this.instanceId = instanceId;
    }
}`;

// line index 1 (0-based): "    private String instanceId;"
const FIELD_LINE = 1;
const USAGE_LINE = 7;

describe('DefinitionProcessingService - field definition single location', () => {
  const fieldDeclParams = (): DefinitionParams => {
    const line = SRC.split('\n')[FIELD_LINE];
    return {
      textDocument: { uri: URI },
      position: { line: FIELD_LINE, character: line.indexOf('instanceId') },
    };
  };

  const fieldUsageParams = (): DefinitionParams => {
    const line = SRC.split('\n')[USAGE_LINE];
    return {
      textDocument: { uri: URI },
      position: { line: USAGE_LINE, character: line.indexOf('instanceId') },
    };
  };

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  it('returns a single location for a field shadowed by a same-named constructor parameter', async () => {
    const symbolManager = new ApexSymbolManager();
    const compilerService = new CompilerService();
    const table = new SymbolTable();
    const listener = new FullSymbolCollectorListener(table);
    compilerService.compile(SRC, URI, listener, {});
    await Effect.runPromise(symbolManager.addSymbolTable(table, URI));
    const definitionService = new DefinitionProcessingService(
      getLogger(),
      symbolManager,
    );

    const result = await definitionService.processDefinition(fieldDeclParams());

    expect(result).toBeDefined();
    // Exactly one location — the field declaration — NOT the field plus the
    // same-named constructor parameter.
    expect(result!.length).toBe(1);
    expect(result![0].range.start.line).toBe(FIELD_LINE);
  });

  it('returns a single location after a layered public-api + full recompile (same-line artifacts)', async () => {
    // Mirror the pool worker: ingest the file at public-api detail, then
    // recompile it at full detail. The two passes can leave two same-kind field
    // entries on the field's line; the (uri, line) collapse must fold them.
    const symbolManager = new ApexSymbolManager();
    const compilerService = new CompilerService();

    const publicApiTable = new SymbolTable();
    compilerService.compile(
      SRC,
      URI,
      new VisibilitySymbolListener('public-api', publicApiTable),
      {},
    );
    await Effect.runPromise(symbolManager.addSymbolTable(publicApiTable, URI));

    const fullTable = new SymbolTable();
    compilerService.compile(
      SRC,
      URI,
      new FullSymbolCollectorListener(fullTable),
      { collectReferences: true, resolveReferences: true },
    );
    await Effect.runPromise(symbolManager.addSymbolTable(fullTable, URI));

    const definitionService = new DefinitionProcessingService(
      getLogger(),
      symbolManager,
    );

    const result = await definitionService.processDefinition(fieldDeclParams());

    expect(result).toBeDefined();
    expect(result!.length).toBe(1);
    expect(result![0].range.start.line).toBe(FIELD_LINE);

    const usageResult =
      await definitionService.processDefinition(fieldUsageParams());
    expect(usageResult).toBeDefined();
    expect(usageResult).toHaveLength(1);
    expect(usageResult![0].range.start.line).toBe(FIELD_LINE);
  });

  it('resolves a this-qualified usage to the field instead of the shadowing parameter', async () => {
    const symbolManager = new ApexSymbolManager();
    const compilerService = new CompilerService();
    const table = new SymbolTable();
    compilerService.compile(SRC, URI, new FullSymbolCollectorListener(table), {
      collectReferences: true,
      resolveReferences: true,
    });
    await Effect.runPromise(symbolManager.addSymbolTable(table, URI));
    const definitionService = new DefinitionProcessingService(
      getLogger(),
      symbolManager,
    );

    const result =
      await definitionService.processDefinition(fieldUsageParams());

    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result![0].range.start.line).toBe(FIELD_LINE);
  });

  it('resolves a this-qualified field independent of symbol insertion order', async () => {
    const symbolManager = new ApexSymbolManager();
    const compilerService = new CompilerService();
    const table = new SymbolTable();
    compilerService.compile(SRC, URI, new FullSymbolCollectorListener(table), {
      collectReferences: true,
      resolveReferences: true,
    });

    // Worker tables can arrive in a different order after public-api ingestion
    // and full-detail replacement. Reproduce the order that exposed the bug:
    // the same-named constructor parameter precedes the class field.
    table.getAllSymbols().sort((left, right) => {
      if (left.name !== 'instanceId' || right.name !== 'instanceId') return 0;
      if (left.kind === SymbolKind.Variable) return -1;
      if (right.kind === SymbolKind.Variable) return 1;
      return 0;
    });

    await Effect.runPromise(symbolManager.addSymbolTable(table, URI));
    const definitionService = new DefinitionProcessingService(
      getLogger(),
      symbolManager,
    );

    const result =
      await definitionService.processDefinition(fieldUsageParams());

    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result![0].range.start.line).toBe(FIELD_LINE);
  });
});
