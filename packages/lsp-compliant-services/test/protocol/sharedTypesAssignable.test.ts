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
 * Compile-time assignability check. `IsAssignable<To, From>` resolves to the
 * literal `true` only when `From` is assignable to `To`, else `false`. The
 * tuple wrappers (`[From] extends [To]`) make the check non-distributive so
 * unions are compared as a whole. `Expect<T extends true>` then constrains its
 * argument to `true`: feeding it a `false` violates the constraint and `tsc`
 * errors on that exact line.
 *
 * This is the sound replacement for the earlier `null as unknown as never`
 * cast, which always type-checked (so the gate caught nothing). Each
 * `_AssertX` alias below is the actual gate — a divergence makes its line a
 * concrete `tsc` error at typecheck time.
 */
type IsAssignable<To, From> = [From] extends [To] ? true : false;
type Expect<T extends true> = T;

// --- apex/queueState ---------------------------------------------------------

// Local params/result must be assignable to the shared contract.
type _AssertQueueStateParams = Expect<
  IsAssignable<SharedQueueStateParams, LocalQueueStateParams>
>;
type _AssertQueueStateResult = Expect<
  IsAssignable<SharedQueueStateResult, LocalQueueStateResponse>
>;
// Params are structurally identical, so the reverse direction also holds
// (non-breaking in both directions).
type _AssertQueueStateParamsReverse = Expect<
  IsAssignable<LocalQueueStateParams, SharedQueueStateParams>
>;

// The parser-ast runtime metrics shape backs the shared SchedulerMetricsShape.
type _AssertSchedulerMetrics = Expect<
  IsAssignable<SchedulerMetricsShape, SchedulerMetrics>
>;

// --- apex/graphData ----------------------------------------------------------

type _AssertGraphDataParams = Expect<
  IsAssignable<SharedGraphDataParams, LocalGraphDataParams>
>;
type _AssertGraphDataParamsReverse = Expect<
  IsAssignable<LocalGraphDataParams, SharedGraphDataParams>
>;
type _AssertGraphDataResult = Expect<
  IsAssignable<SharedGraphDataResult, LocalGraphDataResponse>
>;

// The parser-ast runtime graph shapes back the shared *Shape types.
type _AssertGraphData = Expect<IsAssignable<GraphDataShape, GraphData>>;
type _AssertFileGraphData = Expect<
  IsAssignable<FileGraphDataShape, FileGraphData>
>;
type _AssertTypeGraphData = Expect<
  IsAssignable<TypeGraphDataShape, TypeGraphData>
>;
type _AssertGraphNode = Expect<IsAssignable<GraphNodeShape, GraphNode>>;
type _AssertGraphEdge = Expect<IsAssignable<GraphEdgeShape, GraphEdge>>;

// The local diagnostic-graph correlation backs the shared *Shape type.
type _AssertDiagnosticGraphCorrelation = Expect<
  IsAssignable<DiagnosticGraphCorrelationShape, DiagnosticGraphCorrelation>
>;

describe('shared QueueState/GraphData protocol types', () => {
  it('keeps local queue/graph shapes assignable to the shared contract', () => {
    // The real verification is the compile-time `_AssertX` aliases above; if
    // any local shape diverges from the shared contract, `tsc` fails on its
    // line at typecheck time. This runtime assertion just gives jest a body.
    expect(true).toBe(true);
  });
});
