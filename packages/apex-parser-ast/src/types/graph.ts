/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolLocation, SymbolModifiers } from './symbol';
import { ReferenceType } from '../symbols/ApexSymbolGraph';
import { type EnumValue } from '@salesforce/apex-lsp-shared';

/**
 * Graph node representation based on ApexSymbol structure
 * This is the canonical type for graph nodes in the parser-ast module
 */
export interface GraphNode {
  /** Unique identifier for the node (matches ApexSymbol.id) */
  id: string;

  /** Symbol name (matches ApexSymbol.name) */
  name: string;

  /** Symbol type/kind (matches ApexSymbol.kind) */
  kind: string;

  /** File URI where the symbol is defined (matches ApexSymbol.fileUri) */
  fileUri: string;

  /** Fully qualified name if available (matches ApexSymbol.fqn) */
  fqn?: string;

  /** Location information in source code (matches ApexSymbol.location) */
  location: SymbolLocation;

  /** Symbol modifiers (matches ApexSymbol.modifiers) */
  modifiers: SymbolModifiers;

  /** Parent symbol ID if applicable (matches ApexSymbol.parentId) */
  parentId?: string | null;

  /** Namespace if applicable (matches ApexSymbol.namespace) */
  namespace?: string | null;

  /** Annotations if any (matches ApexSymbol.annotations) */
  annotations?: Array<{
    name: string;
    parameters?: Array<{ name: string; value: string }>;
  }>;

  /** Additional graph-specific properties */
  nodeId: number;
  referenceCount: number;
}

/**
 * Graph edge representation based on ReferenceEdge structure
 * This is the canonical type for graph edges in the parser-ast module
 */
export interface GraphEdge {
  /** Unique identifier for the edge */
  id: string;

  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Reference type (matches ReferenceType enum) */
  type: EnumValue<typeof ReferenceType>;

  /** Source file URI */
  sourceFileUri: string;

  /** Target file URI */
  targetFileUri: string;

  /** Additional context information */
  context?: {
    methodName?: string;
    parameterIndex?: number;
    isStatic?: boolean;
    namespace?: string;
  };
}

/**
 * Complete graph data structure
 * This is the canonical type for complete graph data in the parser-ast module
 */
export interface GraphData {
  /** All nodes in the graph */
  nodes: GraphNode[];

  /** All edges in the graph */
  edges: GraphEdge[];

  /** Graph metadata */
  metadata: {
    totalNodes: number;
    totalEdges: number;
    totalFiles: number;
    lastUpdated: number;
  };
}

/**
 * Graph data filtered by file
 */
export interface FileGraphData extends GraphData {
  /** The file URI this data represents */
  fileUri: string;
}

/**
 * Graph data filtered by symbol type
 */
export interface TypeGraphData extends GraphData {
  /** The symbol type this data represents */
  symbolType: string;
}
