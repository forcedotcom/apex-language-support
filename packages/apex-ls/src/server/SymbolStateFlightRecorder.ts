/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/** Compact scalar attributes accepted by the tracing bridge. */
export type SymbolStateSpanAttributes = Record<
  string,
  string | number | boolean
>;

export interface SymbolStateReference {
  readonly name?: string;
  readonly context?: string | number;
  readonly range?: unknown;
  readonly resolvedSymbolId?: string;
  readonly semanticContext?: unknown;
  readonly chainNodes?: readonly SymbolStateReference[];
}

export interface SymbolStateSymbol {
  readonly id?: string;
  readonly name?: string;
  readonly kind?: string | number;
  readonly range?: unknown;
}

export type SymbolStateSemanticProvenance =
  'resolved-reference' | 'parser-reference' | 'parser-symbol' | 'none';

export interface SymbolStateEventInput {
  readonly phase: string;
  readonly uri: string;
  readonly workerId: string;
  readonly workerRole: string;
  readonly documentVersion?: number;
  readonly ownerVersion?: number;
  readonly tableVersion?: number;
  readonly parseCompleteness?: string;
  readonly content?: string;
  readonly detailLevel?: string | null;
  readonly symbols?: readonly unknown[];
  readonly references?: readonly SymbolStateReference[];
  readonly cursorReferences?: readonly SymbolStateReference[];
  readonly cursorSymbols?: readonly SymbolStateSymbol[];
  readonly cursorPosition?: {
    readonly line: number;
    readonly character: number;
  };
  readonly outcome?: string;
  readonly anomaly?: string;
  readonly extra?: SymbolStateSpanAttributes;
}

interface RecordedSymbolStateEvent {
  readonly sequence: number;
  readonly timestamp: number;
  readonly phase: string;
  readonly uri: string;
  readonly workerId: string;
  readonly workerRole: string;
  readonly documentVersion: number;
  readonly ownerVersion: number;
  readonly tableVersion: number;
  readonly parseCompleteness: string;
  readonly contentHash: string;
  readonly stateId: string;
  readonly generation: number;
  readonly detailLevel: string;
  readonly symbolCount: number;
  readonly referenceCount: number;
  readonly tableFingerprint: string;
  readonly outcome: string;
  readonly semanticProvenance: SymbolStateSemanticProvenance;
  readonly provenanceUri: string;
  readonly provenanceIdentity: string;
  readonly provenanceRange: string;
  readonly anomaly?: string;
  readonly references?: readonly SymbolStateReference[];
}

const MAX_EVENTS_PER_URI = 100;
const MAX_SNAPSHOT_EVENTS = 24;
const MAX_SNAPSHOT_ATTRIBUTE_CHARS = 16_000;
const MAX_REFERENCES_PER_EVENT = 12;
const MAX_FROZEN_SNAPSHOTS = 64;

type ComparableRange = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

function comparableRange(value: unknown): ComparableRange | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const range = value as Partial<ComparableRange>;
  return typeof range.startLine === 'number' &&
    typeof range.startColumn === 'number' &&
    typeof range.endLine === 'number' &&
    typeof range.endColumn === 'number'
    ? (range as ComparableRange)
    : undefined;
}

function rangeSize(value: unknown): [number, number] {
  const range = comparableRange(value);
  return range
    ? [range.endLine - range.startLine, range.endColumn - range.startColumn]
    : [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
}

function narrowest<T extends { readonly range?: unknown }>(
  values: readonly T[],
): T | undefined {
  return [...values].sort((left, right) => {
    const [leftLines, leftColumns] = rangeSize(left.range);
    const [rightLines, rightColumns] = rangeSize(right.range);
    return leftLines - rightLines || leftColumns - rightColumns;
  })[0];
}

function rangeContainsPosition(
  value: unknown,
  position: { readonly line: number; readonly character: number },
): boolean {
  const range = comparableRange(value);
  if (!range) return false;
  const afterStart =
    position.line > range.startLine ||
    (position.line === range.startLine &&
      position.character >= range.startColumn);
  const beforeEnd =
    position.line < range.endLine ||
    (position.line === range.endLine && position.character <= range.endColumn);
  return afterStart && beforeEnd;
}

function semanticProvenance(input: SymbolStateEventInput): {
  kind: SymbolStateSemanticProvenance;
  uri: string;
  identity: string;
  range: string;
} {
  const reference = selectSymbolStateReference(
    input.cursorReferences ?? [],
    input.cursorPosition,
  );
  if (reference) {
    return {
      kind: reference.resolvedSymbolId
        ? 'resolved-reference'
        : 'parser-reference',
      uri: input.uri,
      identity:
        reference.resolvedSymbolId ??
        `${String(reference.context ?? 'unknown')}:${reference.name ?? 'unknown'}`,
      range: stableValue(reference.range),
    };
  }

  const symbol = narrowest(input.cursorSymbols ?? []);
  if (symbol) {
    return {
      kind: 'parser-symbol',
      uri: input.uri,
      identity:
        symbol.id ??
        `${String(symbol.kind ?? 'unknown')}:${symbol.name ?? 'unknown'}`,
      range: stableValue(symbol.range),
    };
  }

  return {
    kind: 'none',
    uri: input.uri,
    identity: 'none',
    range: '',
  };
}

/** Select the most precise parser-owned cursor reference, including chains. */
export function selectSymbolStateReference(
  references: readonly SymbolStateReference[],
  position?: { readonly line: number; readonly character: number },
): SymbolStateReference | undefined {
  const cursorReferences: SymbolStateReference[] = [];
  const collectReference = (reference: SymbolStateReference): void => {
    if (!position || rangeContainsPosition(reference.range, position)) {
      cursorReferences.push(reference);
    }
    reference.chainNodes?.forEach(collectReference);
  };
  references.forEach(collectReference);
  return narrowest(cursorReferences);
}

const histories = new Map<string, RecordedSymbolStateEvent[]>();
const generations = new Map<
  string,
  { fingerprint: string; generation: number }
>();
const frozenSnapshots = new Map<string, readonly RecordedSymbolStateEvent[]>();
let sequence = 0;

/** Browser-safe deterministic hash; source contents never enter telemetry. */
export function hashSymbolStateValue(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableValue(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${key}:${stableValue(entry)}`)
    .join(',')}}`;
}

function tableFingerprint(
  symbols: readonly unknown[],
  references: readonly SymbolStateReference[],
): string {
  const symbolValues = symbols.map(stableValue).sort();
  const referenceValues = references
    .map((reference) =>
      stableValue({
        name: reference.name,
        context: reference.context,
        range: reference.range,
        resolvedSymbolId: reference.resolvedSymbolId,
        semanticContext: reference.semanticContext,
        chainNodes: reference.chainNodes,
      }),
    )
    .sort();
  return hashSymbolStateValue(
    `${symbolValues.join('|')}::${referenceValues.join('|')}`,
  );
}

function nextGeneration(uri: string, fingerprint: string): number {
  const current = generations.get(uri);
  if (current?.fingerprint === fingerprint) return current.generation;
  const generation = (current?.generation ?? 0) + 1;
  generations.set(uri, { fingerprint, generation });
  return generation;
}

function compactEvent(event: RecordedSymbolStateEvent): string {
  return JSON.stringify({
    seq: event.sequence,
    at: event.timestamp,
    phase: event.phase,
    worker: event.workerId,
    role: event.workerRole,
    version: event.documentVersion,
    ownerVersion: event.ownerVersion,
    tableVersion: event.tableVersion,
    parseCompleteness: event.parseCompleteness,
    contentHash: event.contentHash,
    stateId: event.stateId,
    generation: event.generation,
    detail: event.detailLevel,
    symbols: event.symbolCount,
    references: event.referenceCount,
    fingerprint: event.tableFingerprint,
    outcome: event.outcome,
    semanticProvenance: event.semanticProvenance,
    provenanceUri: event.provenanceUri,
    provenanceIdentity: event.provenanceIdentity,
    provenanceRange: event.provenanceRange,
    ...(event.anomaly ? { anomaly: event.anomaly } : {}),
    ...(event.references ? { cursorReferences: event.references } : {}),
  });
}

function snapshotAttribute(
  events: readonly RecordedSymbolStateEvent[],
): string {
  const compact = events.map(compactEvent);
  while (
    compact.length > 1 &&
    JSON.stringify(compact).length > MAX_SNAPSHOT_ATTRIBUTE_CHARS
  ) {
    compact.shift();
  }
  let encoded = JSON.stringify(compact);
  if (encoded.length > MAX_SNAPSHOT_ATTRIBUTE_CHARS && compact.length === 1) {
    encoded = JSON.stringify([
      {
        truncated: true,
        originalLength: compact[0].length,
        eventHash: hashSymbolStateValue(compact[0]),
      },
    ]);
  }
  return encoded;
}

/**
 * Record one completed state transition and return attributes for the Effect
 * span that performed it. On an invariant violation, the recent per-URI
 * history is frozen and embedded in that short-lived span.
 */
export function recordSymbolStateEvent(
  input: SymbolStateEventInput,
): SymbolStateSpanAttributes {
  const symbols = input.symbols ?? [];
  const references = input.references ?? [];
  const cursorReferences = input.cursorReferences ?? [];
  const contentHash =
    input.content === undefined
      ? 'unavailable'
      : hashSymbolStateValue(input.content);
  const fingerprint = tableFingerprint(symbols, references);
  const documentVersion = input.documentVersion ?? -1;
  const ownerVersion = input.ownerVersion ?? -1;
  const tableVersion = input.tableVersion ?? -1;
  const parseCompleteness = input.parseCompleteness ?? 'unknown';
  const provenance = semanticProvenance(input);
  const stateId = hashSymbolStateValue(
    `${input.uri}|${documentVersion}|${contentHash}`,
  );
  const generation = nextGeneration(input.uri, fingerprint);
  const event: RecordedSymbolStateEvent = {
    sequence: ++sequence,
    timestamp: Date.now(),
    phase: input.phase,
    uri: input.uri,
    workerId: input.workerId,
    workerRole: input.workerRole,
    documentVersion,
    ownerVersion,
    tableVersion,
    parseCompleteness,
    contentHash,
    stateId,
    generation,
    detailLevel: input.detailLevel ?? 'unknown',
    symbolCount: symbols.length,
    referenceCount: references.length,
    tableFingerprint: fingerprint,
    outcome: input.outcome ?? 'completed',
    semanticProvenance: provenance.kind,
    provenanceUri: provenance.uri,
    provenanceIdentity: provenance.identity,
    provenanceRange: provenance.range,
    ...(input.anomaly ? { anomaly: input.anomaly } : {}),
    ...(cursorReferences.length > 0
      ? {
          references: cursorReferences.slice(0, MAX_REFERENCES_PER_EVENT),
        }
      : {}),
  };
  const history = histories.get(input.uri) ?? [];
  history.push(event);
  if (history.length > MAX_EVENTS_PER_URI) {
    history.splice(0, history.length - MAX_EVENTS_PER_URI);
  }
  histories.set(input.uri, history);

  const attributes: SymbolStateSpanAttributes = {
    'symbol_state.sequence': event.sequence,
    'symbol_state.phase': event.phase,
    'symbol_state.worker_id': event.workerId,
    'symbol_state.worker_role': event.workerRole,
    'symbol_state.document_version': event.documentVersion,
    'symbol_state.owner_version': event.ownerVersion,
    'symbol_state.table_version': event.tableVersion,
    'symbol_state.parse_completeness': event.parseCompleteness,
    'symbol_state.content_hash': event.contentHash,
    'symbol_state.state_id': event.stateId,
    'symbol_state.table_generation': event.generation,
    'symbol_state.table_fingerprint': event.tableFingerprint,
    'symbol_state.symbol_count': event.symbolCount,
    'symbol_state.reference_count': event.referenceCount,
    'symbol_state.detail_level': event.detailLevel,
    'symbol_state.outcome': event.outcome,
    'symbol_state.semantic_provenance': event.semanticProvenance,
    'symbol_state.provenance_uri': event.provenanceUri,
    'symbol_state.provenance_identity': event.provenanceIdentity,
    'symbol_state.provenance_range': event.provenanceRange,
    'symbol_state.event': compactEvent(event),
    ...(input.extra ?? {}),
  };

  if (input.anomaly) {
    const snapshotId = `${event.stateId}:${event.generation}:${event.sequence}`;
    const snapshot = history.slice(-MAX_SNAPSHOT_EVENTS);
    frozenSnapshots.set(snapshotId, snapshot);
    while (frozenSnapshots.size > MAX_FROZEN_SNAPSHOTS) {
      const oldestSnapshotId = frozenSnapshots.keys().next().value;
      if (oldestSnapshotId === undefined) break;
      frozenSnapshots.delete(oldestSnapshotId);
    }
    attributes['symbol_state.anomaly'] = input.anomaly;
    attributes['debug.snapshot_id'] = snapshotId;
    attributes['debug.snapshot'] = snapshotAttribute(snapshot);
  }
  return attributes;
}

export function getFrozenSymbolStateSnapshot(
  snapshotId: string,
): readonly string[] | undefined {
  return frozenSnapshots.get(snapshotId)?.map(compactEvent);
}

/** Release development-only recorder state when an editor document closes. */
export function clearSymbolStateForUri(uri: string): void {
  histories.delete(uri);
  generations.delete(uri);
  for (const [snapshotId, events] of frozenSnapshots) {
    if (events.some((event) => event.uri === uri)) {
      frozenSnapshots.delete(snapshotId);
    }
  }
}

export function resetSymbolStateFlightRecorder(): void {
  histories.clear();
  generations.clear();
  frozenSnapshots.clear();
  sequence = 0;
}
