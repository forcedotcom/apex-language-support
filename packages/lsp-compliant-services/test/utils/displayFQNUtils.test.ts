/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { toDisplayFQN } from '../../src/utils/displayFQNUtils';

describe('toDisplayFQN', () => {
  it('returns empty/falsy input unchanged', () => {
    expect(toDisplayFQN('')).toBe('');
  });

  it('passes through a simple name', () => {
    expect(toDisplayFQN('MyClass')).toBe('MyClass');
  });

  it('passes through a qualified name with no block symbols', () => {
    expect(toDisplayFQN('System.Map.put')).toBe('System.Map.put');
  });

  it('removes legacy block symbol patterns', () => {
    expect(toDisplayFQN('TestClass.class_1.someMethod')).toBe(
      'TestClass.someMethod',
    );
    expect(toDisplayFQN('TestClass.class_1.method_2.block_3.ifVar')).toBe(
      'TestClass.ifVar',
    );
  });

  it('removes StructureListener block patterns (block_line_column)', () => {
    expect(toDisplayFQN('TestClass.block_15_36.myVar')).toBe('TestClass.myVar');
  });

  it('deduplicates consecutive identical parts', () => {
    expect(
      toDisplayFQN('FileUtilities.FileUtilities.createFile.createFile.data'),
    ).toBe('FileUtilities.createFile.data');
  });

  it('filters empty segments caused by double dots', () => {
    expect(toDisplayFQN('System..put')).toBe('System.put');
  });

  it('filters multiple consecutive empty segments', () => {
    expect(toDisplayFQN('System...put')).toBe('System.put');
  });

  it('filters leading empty segment from leading dot', () => {
    expect(toDisplayFQN('.System.Map')).toBe('System.Map');
  });

  it('filters trailing empty segment from trailing dot', () => {
    expect(toDisplayFQN('System.Map.')).toBe('System.Map');
  });

  it('handles all block scope types', () => {
    const scopeTypes = [
      'if',
      'while',
      'for',
      'try',
      'catch',
      'finally',
      'switch',
      'when',
      'dowhile',
      'runas',
      'getter',
      'setter',
    ];
    for (const scope of scopeTypes) {
      expect(toDisplayFQN(`TestClass.${scope}_1.myVar`)).toBe(
        'TestClass.myVar',
      );
    }
  });

  it('handles case-insensitive block patterns', () => {
    expect(toDisplayFQN('TestClass.CLASS_1.myField')).toBe('TestClass.myField');
    expect(toDisplayFQN('TestClass.Method_2.myVar')).toBe('TestClass.myVar');
  });

  it('handles combined block removal, deduplication, and empty filtering', () => {
    expect(toDisplayFQN('System..Map.Map.class_1.put.method_2.block_3')).toBe(
      'System.Map.put',
    );
  });
});
