/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

jest.mock('../../src/language-server', () => ({ getClient: jest.fn() }));

import {
  convertProtocolGraphData,
  graphNodeNavigationUri,
} from '../../src/graph/showGraph';

describe('convertProtocolGraphData', () => {
  it('maps supported symbol kinds and numeric relationship types', () => {
    const range = {
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: 1,
    };
    const node = (id: string, kind: string) => ({
      id,
      name: id,
      kind,
      fileUri: `file:///${id}.cls`,
      location: { symbolRange: range, identifierRange: range },
      modifiers: {
        visibility: 'public' as const,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      nodeId: 1,
      referenceCount: 0,
    });
    const edge = (id: string, type: number) => ({
      id,
      source: 'class',
      target: 'method',
      type,
      sourceFileUri: 'file:///class.cls',
      targetFileUri: 'file:///method.cls',
    });

    const converted = convertProtocolGraphData({
      nodes: [
        node('class', 'interface'),
        node('block', 'block'),
        node('method', 'constructor'),
        node('property', 'field'),
      ],
      edges: [
        edge('inherits', 4),
        edge('implements', 5),
        edge('calls', 1),
        edge('contains', 9),
      ],
      metadata: { totalNodes: 4, totalEdges: 4, totalFiles: 2, lastUpdated: 0 },
    });

    expect(converted.nodes.map(({ type }) => type)).toEqual([
      'class',
      'block',
      'method',
      'property',
    ]);
    expect(converted.edges.map(({ type }) => type)).toEqual([
      'inherits',
      'implements',
      'calls',
      'contains',
    ]);
  });
});

describe('graphNodeNavigationUri', () => {
  it('parses protocol file URI strings without treating them as file-system paths', () => {
    const uri = graphNodeNavigationUri('file:///workspace/classes/Test.cls');

    expect(uri.toString()).toBe('file:///workspace/classes/Test.cls');
  });

  it('preserves legacy file-system path navigation', () => {
    const uri = graphNodeNavigationUri('/workspace/classes/Test.cls');

    expect(uri.toString()).toBe('file:///workspace/classes/Test.cls');
  });
});
