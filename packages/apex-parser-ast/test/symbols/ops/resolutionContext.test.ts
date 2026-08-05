/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolCollectorListener } from '../../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../../src/parser/compilerService';
import {
  createIncompleteResolutionContext,
  createResolutionContextFromSymbolTable,
} from '../../../src/symbols/ops/resolutionContext';
import { SymbolTable } from '../../../src/types/symbol';

describe('parser-owned resolution context', () => {
  it('uses symbol state when comments and strings contain modifier-like words', () => {
    const source = [
      'public class ResolutionContextExample {',
      '  private void run() {',
      '    // global static public class trigger import misleading',
      "    String bait = 'global static public class trigger import';",
      '    Integer value = 1;',
      '  }',
      '}',
    ].join('\n');
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = new CompilerService().compile(
      source,
      'file:///ResolutionContextExample.cls',
      listener,
    );

    expect(result.result).toBeDefined();
    const context = createResolutionContextFromSymbolTable(
      result.result,
      { line: 4, character: 12 },
      'file:///ResolutionContextExample.cls',
    );

    expect(context.semanticState).toBe('complete');
    expect(context.currentScope).toBe('method');
    expect(context.scopeChain).toContain('method');
    expect(context.accessModifier).toBe('private');
    expect(context.isStatic).toBe(false);
    expect(context.importStatements).toEqual([]);
  });

  it('preserves uncertainty when no parser-owned table is available', () => {
    const context = createIncompleteResolutionContext(
      'file:///MisleadingName.cls',
    );

    expect(context.semanticState).toBe('incomplete');
    expect(context.namespaceContext).toBe('');
    expect(context.currentScope).toBe('unknown');
    expect(context.scopeChain).toEqual([]);
  });

  it('does not invent context from an empty broken-edit snapshot', () => {
    const context = createResolutionContextFromSymbolTable(
      new SymbolTable(),
      { line: 0, character: 42 },
      'file:///public-static-global-test.cls',
    );

    expect(context.semanticState).toBe('incomplete');
    expect(context.namespaceContext).toBe('');
    expect(context.currentScope).toBe('unknown');
    expect(context.scopeChain).toEqual([]);
    expect(context.isStatic).toBe(false);
  });
});
