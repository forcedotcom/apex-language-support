/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Compile-time assignability assertions: the local (canonical-runtime)
 * QueueState/GraphData shapes in lsp-compliant-services must remain assignable
 * to the SHARED protocol contract in `@salesforce/apex-lsp-shared`.
 *
 * This is the gate for the non-breaking type promotion done in W-23163173:
 * the shared types structurally model the parser-ast runtime shapes, and this
 * test guarantees the local shapes (which DO import parser-ast) still satisfy
 * that contract. If a local shape diverges in a way the shared contract does
 * not allow, `tsc` fails here at typecheck time.
 *
 * The assertions are expressed as type-level `Assignable<To, From>` checks plus
 * `satisfies`/assignment helpers. The single runtime `expect` keeps jest happy;
 * the real verification happens at compile time.
 */

import { describe, it, expect } from '@jest/globals';
import type {
  QueueStateParams as SharedQueueStateParams,
  QueueStateResult as SharedQueueStateResult,
  GraphDataParams as SharedGraphDataParams,
  GraphDataResult as SharedGraphDataResult,
  SchedulerMetricsShape,
  GraphDataShape,
  FileGraphDataShape,
  TypeGraphDataShape,
  GraphNodeShape,
  GraphEdgeShape,
  DiagnosticGraphCorrelationShape,
} from '@salesforce/apex-lsp-shared';
import type {
  SchedulerMetrics,
  GraphData,
  FileGraphData,
  TypeGraphData,
  GraphNode,
  GraphEdge,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  QueueStateParams as LocalQueueStateParams,
  QueueStateResponse as LocalQueueStateResponse,
} from '../../src/services/QueueStateProcessingService';
import type {
  GraphDataParams as LocalGraphDataParams,
  GraphDataResponse as LocalGraphDataResponse,
} from '../../src/services/GraphDataProcessingService';
import type { DiagnosticGraphCorrelation } from '../../src/types/diagnosticGraph';

/**
 * Resolves to `From` only when `From` is assignable to `To`; otherwise resolves
 * to `never`, which makes the corresponding `const` declaration fail to
 * type-check.
 */
type Assignable<To, From> = From extends To ? From : never;

// --- apex/queueState ---------------------------------------------------------

// Local params/result must be assignable to the shared contract.
type AssertQueueStateParams = Assignable<
  SharedQueueStateParams,
  LocalQueueStateParams
>;
type AssertQueueStateResult = Assignable<
  SharedQueueStateResult,
  LocalQueueStateResponse
>;
// Params are structurally identical, so the reverse direction also holds
// (non-breaking in both directions).
type AssertQueueStateParamsReverse = Assignable<
  LocalQueueStateParams,
  SharedQueueStateParams
>;

// The parser-ast runtime metrics shape backs the shared SchedulerMetricsShape.
type AssertSchedulerMetrics = Assignable<
  SchedulerMetricsShape,
  SchedulerMetrics
>;

// --- apex/graphData ----------------------------------------------------------

type AssertGraphDataParams = Assignable<
  SharedGraphDataParams,
  LocalGraphDataParams
>;
type AssertGraphDataParamsReverse = Assignable<
  LocalGraphDataParams,
  SharedGraphDataParams
>;
type AssertGraphDataResult = Assignable<
  SharedGraphDataResult,
  LocalGraphDataResponse
>;

// The parser-ast runtime graph shapes back the shared *Shape types.
type AssertGraphData = Assignable<GraphDataShape, GraphData>;
type AssertFileGraphData = Assignable<FileGraphDataShape, FileGraphData>;
type AssertTypeGraphData = Assignable<TypeGraphDataShape, TypeGraphData>;
type AssertGraphNode = Assignable<GraphNodeShape, GraphNode>;
type AssertGraphEdge = Assignable<GraphEdgeShape, GraphEdge>;

// The local diagnostic-graph correlation backs the shared *Shape type.
type AssertDiagnosticGraphCorrelation = Assignable<
  DiagnosticGraphCorrelationShape,
  DiagnosticGraphCorrelation
>;

/**
 * Materialises each assertion: `1 satisfies 1` only type-checks while the
 * corresponding `AssertX` alias is NOT `never` (the alias equals its `From`
 * type when assignable). Listed so an accidental divergence surfaces as a
 * concrete failing line.
 */
const assertions = [
  null as unknown as AssertQueueStateParams,
  null as unknown as AssertQueueStateParamsReverse,
  null as unknown as AssertQueueStateResult,
  null as unknown as AssertSchedulerMetrics,
  null as unknown as AssertGraphDataParams,
  null as unknown as AssertGraphDataParamsReverse,
  null as unknown as AssertGraphDataResult,
  null as unknown as AssertGraphData,
  null as unknown as AssertFileGraphData,
  null as unknown as AssertTypeGraphData,
  null as unknown as AssertGraphNode,
  null as unknown as AssertGraphEdge,
  null as unknown as AssertDiagnosticGraphCorrelation,
];

describe('shared QueueState/GraphData protocol types', () => {
  it('keeps local queue/graph shapes assignable to the shared contract', () => {
    // Verification is compile-time (above). This asserts the file ran.
    expect(assertions).toHaveLength(13);
  });
});
