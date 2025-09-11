/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HierarchicalReferenceResolver } from '../../src/types/hierarchicalReference';
import { ReferenceContext } from '../../src/types/typeReference';

describe('HierarchicalReferenceResolver POC', () => {
  let resolver: HierarchicalReferenceResolver;

  beforeEach(() => {
    resolver = new HierarchicalReferenceResolver();
  });

  it('should create hierarchical structure for a.b.c', () => {
    const mockLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 20 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 20,
      },
    };

    const result = resolver.resolveQualifiedReference(
      'a.b.c',
      mockLocation,
      ReferenceContext.METHOD_CALL,
    );

    expect(result.name).toBe('a.b.c');
    expect(result.fullPath).toEqual(['a', 'b', 'c']);
    expect(result.children).toHaveLength(1);

    const child = result.children[0];
    expect(child.name).toBe('b.c');
    expect(child.fullPath).toEqual(['b', 'c']);
    expect(child.children).toHaveLength(1);

    const grandchild = child.children[0];
    expect(grandchild.name).toBe('c');
    expect(grandchild.fullPath).toEqual(['c']);
    expect(grandchild.children).toHaveLength(0);
  });

  it('should cache results for repeated lookups', () => {
    const mockLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 15 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 15,
      },
    };

    const first = resolver.resolveQualifiedReference(
      'System.debug',
      mockLocation,
    );
    const second = resolver.resolveQualifiedReference(
      'System.debug',
      mockLocation,
    );

    // Should be the same object reference (cached)
    expect(first).toBe(second);
  });

  it('should demonstrate the structure needed for symbol resolution', () => {
    const mockLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 25 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 25,
      },
    };

    // Create a hierarchical reference for System.EncodingUtil.urlEncode
    const hierarchicalRef = resolver.resolveQualifiedReference(
      'System.EncodingUtil.urlEncode',
      mockLocation,
      ReferenceContext.METHOD_CALL,
    );

    // This structure provides the parse tree information needed for symbol resolution:
    // - System.EncodingUtil.urlEncode (full reference)
    //   - EncodingUtil.urlEncode (qualifier)
    //     - urlEncode (base method)

    expect(hierarchicalRef.name).toBe('System.EncodingUtil.urlEncode');
    expect(hierarchicalRef.fullPath).toEqual([
      'System',
      'EncodingUtil',
      'urlEncode',
    ]);

    // The first child should be the qualifier
    const qualifier = hierarchicalRef.children[0];
    expect(qualifier.name).toBe('EncodingUtil.urlEncode');
    expect(qualifier.fullPath).toEqual(['EncodingUtil', 'urlEncode']);

    // The base method should be the leaf
    const baseMethod = qualifier.children[0];
    expect(baseMethod.name).toBe('urlEncode');
    expect(baseMethod.fullPath).toEqual(['urlEncode']);

    // This hierarchical structure allows the symbol resolver to:
    // 1. Find the urlEncode method
    // 2. Look for urlEncode within EncodingUtil
    // 3. Look for EncodingUtil within System
    // Instead of just returning the System class for System.EncodingUtil.urlEncode
  });

  it('should test enhanced TypeReference with hierarchical support', () => {
    const mockLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 15 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 15,
      },
    };

    // Test hierarchical reference resolver
    const hierarchicalRef = resolver.resolveQualifiedReference(
      'System.debug',
      mockLocation,
      ReferenceContext.METHOD_CALL,
    );

    expect(hierarchicalRef.name).toBe('System.debug');
    expect(hierarchicalRef.fullPath).toEqual(['System', 'debug']);
    expect(hierarchicalRef.context).toBe(0); // METHOD_CALL
    expect(hierarchicalRef.children).toHaveLength(1);
    expect(hierarchicalRef.children[0].name).toBe('debug');
    expect(hierarchicalRef.children[0].fullPath).toEqual(['debug']);
  });
});
