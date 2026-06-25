/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Protocol contract types for the `apex/queueState` and `apex/graphData`
 * custom LSP requests.
 *
 * These are the SHARED, transport-facing shapes. They STRUCTURALLY model the
 * canonical runtime types that live in `@salesforce/apex-lsp-parser-ast`
 * (`SchedulerMetrics`, `GraphData`/`GraphNode`/`GraphEdge`/`FileGraphData`/
 * `TypeGraphData`) and `@salesforce/lsp-compliant-services`
 * (`DiagnosticGraphCorrelation`) WITHOUT importing them: `apex-lsp-shared`
 * intentionally has no `apex-parser-ast` dependency (kept lightweight — see
 * index.ts:120). The local runtime shapes are asserted assignable to these in
 * `lsp-compliant-services/test/protocol/sharedTypesAssignable.test.ts`.
 *
 * Everything here is structural-clone-safe (plain data only — no classes,
 * Effects, functions, or live references) so it can cross the postMessage /
 * JSON-RPC boundary.
 */

import type { Diagnostic } from 'vscode-languageserver';
import { Priority } from './types/priority';

/**
 * Worker topology status, present when language-server workers are enabled.
 * Structurally mirrors `SchedulerMetrics.workerTopology`.
 */
export interface WorkerTopologyShape {
  readonly enabled: boolean;
  readonly dataOwner: { readonly active: boolean };
  readonly requestPool: {
    readonly size: number;
    readonly active: boolean;
  };
  readonly resourceLoader: { readonly active: boolean } | null;
  readonly dispatchedCount: number;
  readonly coordinatorOnlyTypes: readonly string[];
}

/**
 * Scheduler metrics snapshot returned by `apex/queueState`.
 *
 * Records are keyed by {@link Priority}. Optional breakdown fields map a
 * priority to a `requestType -> count` record. Structurally mirrors
 * `SchedulerMetrics` in apex-parser-ast (`types/queue.ts`).
 */
export interface SchedulerMetricsShape {
  readonly queueSizes: Readonly<Record<Priority, number>>;
  readonly tasksStarted: number;
  readonly tasksCompleted: number;
  readonly tasksDropped: number;
  /** Request type breakdown per priority: priority -> requestType -> count (processed/completed tasks) */
  readonly requestTypeBreakdown?: Readonly<
    Record<Priority, Readonly<Record<string, number>>>
  >;
  /** Queued request type breakdown per priority: priority -> requestType -> count (waiting in queue) */
  readonly queuedRequestTypeBreakdown?: Readonly<
    Record<Priority, Readonly<Record<string, number>>>
  >;
  /** Active request type breakdown per priority: priority -> requestType -> count (currently executing) */
  readonly activeRequestTypeBreakdown?: Readonly<
    Record<Priority, Readonly<Record<string, number>>>
  >;
  /** Queue utilization percentage per priority (0-100) */
  readonly queueUtilization?: Readonly<Record<Priority, number>>;
  /** Currently active (executing) tasks per priority */
  readonly activeTasks?: Readonly<Record<Priority, number>>;
  /** Queue capacity per priority (bounded size) - single number (legacy) or per-priority Record */
  readonly queueCapacity: number | Readonly<Record<Priority, number>>;
  /** Back pressure metrics: enqueue retry counts per priority */
  readonly enqueueRetries?: Readonly<Record<Priority, number>>;
  /** Back pressure metrics: average enqueue wait time per priority (ms) */
  readonly enqueueWaitTime?: Readonly<Record<Priority, number>>;
  /** Back pressure metrics: back pressure duration per priority (ms) */
  readonly backPressureDuration?: Readonly<Record<Priority, number>>;
  /** Back pressure metrics: back pressure event count per priority */
  readonly backPressureEvents?: Readonly<Record<Priority, number>>;
  /** Worker topology status (present when workers are enabled) */
  readonly workerTopology?: WorkerTopologyShape;
}

/**
 * Source-code range used by graph node locations. 1-based lines, 0-based
 * columns, matching apex-parser-ast `Range`.
 */
export interface RangeShape {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * Location of a graph node in source code. Mirrors apex-parser-ast
 * `SymbolLocation`.
 */
export interface SymbolLocationShape {
  symbolRange: RangeShape;
  identifierRange: RangeShape;
}

/**
 * Modifiers applied to a graph node's symbol. Mirrors apex-parser-ast
 * `SymbolModifiers`. `visibility` is the string union of apex-parser-ast
 * `SymbolVisibility` enum values (modelled as a string union to avoid the
 * enum import).
 */
export interface SymbolModifiersShape {
  visibility: 'public' | 'private' | 'protected' | 'global' | 'default';
  isStatic: boolean;
  isFinal: boolean;
  isAbstract: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  isTransient: boolean;
  isTestMethod: boolean;
  isWebService: boolean;
  isBuiltIn: boolean;
}

/**
 * Annotation attached to a graph node. Mirrors the inline annotation shape on
 * apex-parser-ast `GraphNode`.
 */
export interface GraphNodeAnnotationShape {
  name: string;
  parameters?: Array<{ name: string; value: string }>;
}

/**
 * Graph node — structurally mirrors apex-parser-ast `GraphNode`
 * (`types/graph.ts`).
 */
export interface GraphNodeShape {
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
  location: SymbolLocationShape;
  /** Symbol modifiers (matches ApexSymbol.modifiers) */
  modifiers: SymbolModifiersShape;
  /** Parent symbol ID if applicable (matches ApexSymbol.parentId) */
  parentId?: string | null;
  /** Namespace if applicable (matches ApexSymbol.namespace) */
  namespace?: string | null;
  /** Annotations if any (matches ApexSymbol.annotations) */
  annotations?: GraphNodeAnnotationShape[];
  /** Additional graph-specific properties */
  nodeId: number;
  referenceCount: number;
}

/**
 * Graph edge — structurally mirrors apex-parser-ast `GraphEdge`
 * (`types/graph.ts`). `type` carries an apex-parser-ast `ReferenceType` value;
 * since that const object lives in parser-ast it is modelled here as
 * `string | number` (an `EnumValue<typeof ReferenceType>` is a numeric literal
 * union, assignable to `number`).
 */
export interface GraphEdgeShape {
  /** Unique identifier for the edge */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Reference type (apex-parser-ast ReferenceType value) */
  type: string | number;
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
 * Complete graph data structure — structurally mirrors apex-parser-ast
 * `GraphData`.
 */
export interface GraphDataShape {
  /** All nodes in the graph */
  nodes: GraphNodeShape[];
  /** All edges in the graph */
  edges: GraphEdgeShape[];
  /** Graph metadata */
  metadata: {
    totalNodes: number;
    totalEdges: number;
    totalFiles: number;
    lastUpdated: number;
  };
}

/**
 * Graph data filtered by file — mirrors apex-parser-ast `FileGraphData`.
 */
export interface FileGraphDataShape extends GraphDataShape {
  /** The file URI this data represents */
  fileUri: string;
}

/**
 * Graph data filtered by symbol type — mirrors apex-parser-ast `TypeGraphData`.
 */
export interface TypeGraphDataShape extends GraphDataShape {
  /** The symbol type this data represents */
  symbolType: string;
}

/**
 * Correlation between a diagnostic and related graph nodes/edges — structurally
 * mirrors `DiagnosticGraphCorrelation` in lsp-compliant-services
 * (`types/diagnosticGraph.ts`). Uses the vscode-languageserver `Diagnostic`.
 */
export interface DiagnosticGraphCorrelationShape {
  diagnostic: Diagnostic;
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  analysis?: {
    isFalsePositive: boolean;
    reason: string;
    evidence: Array<{
      type: 'node' | 'edge' | 'relationship';
      description: string;
      nodeId?: string;
      edgeId?: string;
    }>;
    suggestions?: string[];
  };
}

/**
 * Parameters for the `apex/queueState` request.
 */
export interface QueueStateParams {
  /** Include request type breakdown in response */
  includeRequestTypeBreakdown?: boolean;
  /** Include queue utilization in response */
  includeUtilization?: boolean;
  /** Include active task counts in response */
  includeActiveTasks?: boolean;
}

/**
 * Result of the `apex/queueState` request.
 */
export interface QueueStateResult {
  /** The scheduler metrics */
  metrics: SchedulerMetricsShape;
  /** Request metadata */
  metadata: {
    timestamp: number;
    processingTime: number;
  };
}

/**
 * Parameters for the `apex/graphData` request.
 */
export interface GraphDataParams {
  /** Type of graph data to retrieve */
  type: 'all' | 'file' | 'type';
  /** File URI (required for 'file' type) */
  fileUri?: string;
  /** Symbol type (required for 'type' type) */
  symbolType?: string;
  /** Include metadata in response */
  includeMetadata?: boolean;
  /** Include diagnostics and correlations (requires fileUri for file-specific diagnostics) */
  includeDiagnostics?: boolean;
}

/**
 * Result of the `apex/graphData` request.
 */
export interface GraphDataResult {
  /** The requested graph data */
  data: GraphDataShape | FileGraphDataShape | TypeGraphDataShape;
  /** Request metadata */
  metadata: {
    requestType: string;
    timestamp: number;
    processingTime: number;
  };
  /** Diagnostics when includeDiagnostics is true */
  diagnostics?: Diagnostic[];
  /** Diagnostic-graph correlations when includeDiagnostics is true */
  diagnosticCorrelations?: DiagnosticGraphCorrelationShape[];
}
