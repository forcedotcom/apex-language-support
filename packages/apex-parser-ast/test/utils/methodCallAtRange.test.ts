/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  findMethodCallAtRange,
  MethodCallAtRange,
} from '../../src/utils/methodCallAtRange';
import { LspRange } from '../../src/utils/expressionRangeFinder';

/** Range covering the first occurrence of `needle` in `source` (0-based). */
const rangeOf = (source: string, needle: string): LspRange => {
  const lines = source.split('\n');
  for (let line = 0; line < lines.length; line++) {
    const character = lines[line].indexOf(needle);
    if (character !== -1) {
      return {
        start: { line, character },
        end: { line, character: character + needle.length },
      };
    }
  }
  throw new Error(`substring not found: ${needle}`);
};

describe('findMethodCallAtRange', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  const call = (source: string, needle: string): MethodCallAtRange | null => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(source, 'Caller.cls', listener);
    return findMethodCallAtRange(result.parseTree, rangeOf(source, needle));
  };

  it('describes a qualified instance call used as a variable initializer', () => {
    const source = [
      'public class Caller {',
      '  public void run() {',
      '    Target t = new Target();',
      "    Integer r = t.computeValue(42, 'x');",
      '  }',
      '}',
    ].join('\n');

    const info = call(source, 'computeValue');

    expect(info).not.toBeNull();
    expect(info!.methodName).toBe('computeValue');
    expect(info!.receiverText).toBe('t');
    expect(info!.returnContext).toBe('variable-initializer');
    expect(info!.returnTypeText).toBe('Integer');
    expect(info!.arguments).toEqual([
      { text: '42', inferredType: 'Integer' },
      { text: "'x'", inferredType: 'String' },
    ]);
  });

  it('describes an unqualified call in a return position', () => {
    const source = [
      'public class Caller {',
      '  public Integer run() {',
      '    return helper(true);',
      '  }',
      '}',
    ].join('\n');

    const info = call(source, 'helper');

    expect(info!.methodName).toBe('helper');
    expect(info!.receiverText).toBeUndefined();
    expect(info!.returnContext).toBe('return');
    expect(info!.returnTypeText).toBe('Integer');
    expect(info!.arguments).toEqual([
      { text: 'true', inferredType: 'Boolean' },
    ]);
  });

  it('classifies a bare-statement call as void', () => {
    const source = [
      'public class Caller {',
      '  public void run() {',
      '    Target t = new Target();',
      '    t.compute(1);',
      '  }',
      '}',
    ].join('\n');

    expect(call(source, 't.compute')!.returnContext).toBe('void');
  });

  it('leaves inferredType undefined for non-literal arguments', () => {
    const source = [
      'public class Caller {',
      '  public void run(String s) {',
      '    Integer r = compute(s);',
      '  }',
      '}',
    ].join('\n');

    expect(call(source, 'compute')!.arguments).toEqual([
      { text: 's', inferredType: undefined },
    ]);
  });

  it('returns null for a field access (not a method call)', () => {
    const source = [
      'public class Caller {',
      '  public void run() {',
      '    Target t = new Target();',
      '    Integer r = t.field;',
      '  }',
      '}',
    ].join('\n');

    expect(call(source, 't.field')).toBeNull();
  });

  it('returns null (no throw) on syntax-error input', () => {
    const source = 'public class Caller { void run() { Integer r = t.compute(1';
    expect(
      findMethodCallAtRange(null, {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      }),
    ).toBeNull();
    // Broken source still parses to *some* tree; finder must not throw.
    expect(() => call(source, 'compute')).not.toThrow();
  });
});
