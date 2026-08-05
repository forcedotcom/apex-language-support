/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  clearSymbolStateForUri,
  getFrozenSymbolStateSnapshot,
  hashSymbolStateValue,
  recordSymbolStateEvent,
  resetSymbolStateFlightRecorder,
} from '../../src/server/SymbolStateFlightRecorder';

describe('SymbolStateFlightRecorder', () => {
  beforeEach(() => resetSymbolStateFlightRecorder());

  it('correlates transitions for identical document state', () => {
    const base = {
      uri: 'file:///FileUtilitiesTest.cls',
      workerId: 'worker-1',
      workerRole: 'lspRequest',
      documentVersion: 2,
      ownerVersion: 1,
      tableVersion: 2,
      parseCompleteness: 'complete',
      content: 'property.Beds__c;',
      symbols: [{ name: 'property', kind: 'variable' }],
      references: [{ name: 'property', context: 4 }],
    } as const;

    const prepared = recordSymbolStateEvent({
      ...base,
      phase: 'request.prepare.hover',
    });
    const resolved = recordSymbolStateEvent({
      ...base,
      phase: 'request.resolve.hover',
    });

    expect(prepared['symbol_state.state_id']).toBe(
      resolved['symbol_state.state_id'],
    );
    expect(prepared['symbol_state.table_generation']).toBe(
      resolved['symbol_state.table_generation'],
    );
    expect(prepared['symbol_state.content_hash']).toBe(
      hashSymbolStateValue(base.content),
    );
    expect(resolved['symbol_state.document_version']).toBe(2);
    expect(resolved['symbol_state.table_version']).toBe(2);
    expect(resolved['symbol_state.parse_completeness']).toBe('complete');
  });

  it('records exact parser-reference provenance from the narrowest chain node', () => {
    const attributes = recordSymbolStateEvent({
      phase: 'request.resolve.definition',
      uri: 'file:///FileUtilitiesTest.cls',
      workerId: 'request-1',
      workerRole: 'lspRequest',
      documentVersion: 7,
      tableVersion: 7,
      parseCompleteness: 'complete',
      cursorPosition: { line: 10, character: 20 },
      cursorReferences: [
        {
          name: 'property.Beds__c',
          context: 11,
          range: {
            startLine: 10,
            startColumn: 8,
            endLine: 10,
            endColumn: 24,
          },
          chainNodes: [
            {
              name: 'property',
              context: 5,
              range: {
                startLine: 10,
                startColumn: 8,
                endLine: 10,
                endColumn: 16,
              },
            },
            {
              name: 'Beds__c',
              context: 3,
              resolvedSymbolId: 'field:Property__c.Beds__c',
              range: {
                startLine: 10,
                startColumn: 17,
                endLine: 10,
                endColumn: 24,
              },
            },
          ],
        },
      ],
    });

    expect(attributes['symbol_state.semantic_provenance']).toBe(
      'resolved-reference',
    );
    expect(attributes['symbol_state.provenance_uri']).toBe(
      'file:///FileUtilitiesTest.cls',
    );
    expect(attributes['symbol_state.provenance_identity']).toBe(
      'field:Property__c.Beds__c',
    );
    expect(attributes['symbol_state.provenance_range']).toContain(
      'startColumn:17',
    );
  });

  it('records declaration-symbol provenance without inventing a reference', () => {
    const attributes = recordSymbolStateEvent({
      phase: 'request.resolve.hover',
      uri: 'file:///Property.cls',
      workerId: 'request-1',
      workerRole: 'lspRequest',
      cursorSymbols: [
        {
          id: 'variable:property',
          name: 'property',
          kind: 'Variable',
          range: {
            startLine: 3,
            startColumn: 20,
            endLine: 3,
            endColumn: 28,
          },
        },
      ],
    });

    expect(attributes['symbol_state.semantic_provenance']).toBe(
      'parser-symbol',
    );
    expect(attributes['symbol_state.provenance_identity']).toBe(
      'variable:property',
    );
  });

  it('freezes recent state automatically when an invariant fails', () => {
    recordSymbolStateEvent({
      phase: 'document.change.store',
      uri: 'file:///FileUtilitiesTest.cls',
      workerId: 'data-owner',
      workerRole: 'dataOwner',
      documentVersion: 2,
      content: 'property.Beds__c;',
    });
    const failed = recordSymbolStateEvent({
      phase: 'request.resolve.hover',
      uri: 'file:///FileUtilitiesTest.cls',
      workerId: 'request-2',
      workerRole: 'lspRequest',
      documentVersion: 2,
      ownerVersion: 1,
      content: 'property.Beds__c;',
      anomaly: 'hover-returned-searching-fallback',
      outcome: 'searching-fallback',
      cursorReferences: [
        { name: 'property', context: 4, resolvedSymbolId: undefined },
      ],
    });

    const snapshotId = failed['debug.snapshot_id'];
    expect(typeof snapshotId).toBe('string');
    expect(getFrozenSymbolStateSnapshot(String(snapshotId))).toHaveLength(2);
    expect(failed['debug.snapshot']).toContain('document.change.store');
    expect(failed['debug.snapshot']).toContain('request.resolve.hover');
  });

  it('increments generation only when the table fingerprint changes', () => {
    const first = recordSymbolStateEvent({
      phase: 'compile.commit',
      uri: 'file:///Test.cls',
      workerId: 'data-owner',
      workerRole: 'dataOwner',
      symbols: [{ name: 'before' }],
    });
    const same = recordSymbolStateEvent({
      phase: 'request.prepare.hover',
      uri: 'file:///Test.cls',
      workerId: 'request-1',
      workerRole: 'lspRequest',
      symbols: [{ name: 'before' }],
    });
    const changed = recordSymbolStateEvent({
      phase: 'compile.commit',
      uri: 'file:///Test.cls',
      workerId: 'data-owner',
      workerRole: 'dataOwner',
      symbols: [{ name: 'after' }],
    });

    expect(same['symbol_state.table_generation']).toBe(
      first['symbol_state.table_generation'],
    );
    expect(changed['symbol_state.table_generation']).toBe(
      Number(first['symbol_state.table_generation']) + 1,
    );
  });

  it('bounds frozen anomaly snapshots and evicts the oldest entry', () => {
    const snapshotIds: string[] = [];
    for (let index = 0; index < 65; index++) {
      const attributes = recordSymbolStateEvent({
        phase: 'request.resolve.hover',
        uri: `file:///Test${index}.cls`,
        workerId: 'request-1',
        workerRole: 'lspRequest',
        anomaly: 'empty-result',
      });
      snapshotIds.push(String(attributes['debug.snapshot_id']));
    }

    expect(getFrozenSymbolStateSnapshot(snapshotIds[0])).toBeUndefined();
    expect(getFrozenSymbolStateSnapshot(snapshotIds[64])).toHaveLength(1);
  });

  it('clears URI-owned history, generation, and snapshots on close', () => {
    const uri = 'file:///Closed.cls';
    const attributes = recordSymbolStateEvent({
      phase: 'request.resolve.definition',
      uri,
      workerId: 'request-1',
      workerRole: 'lspRequest',
      anomaly: 'empty-result',
    });
    const snapshotId = String(attributes['debug.snapshot_id']);

    clearSymbolStateForUri(uri);

    expect(getFrozenSymbolStateSnapshot(snapshotId)).toBeUndefined();
    const next = recordSymbolStateEvent({
      phase: 'document.open',
      uri,
      workerId: 'data-owner',
      workerRole: 'dataOwner',
    });
    expect(next['symbol_state.table_generation']).toBe(1);
  });

  it('keeps oversized snapshot attributes valid JSON', () => {
    const attributes = recordSymbolStateEvent({
      phase: 'request.resolve.hover',
      uri: 'file:///Large.cls',
      workerId: 'request-1',
      workerRole: 'lspRequest',
      anomaly: 'empty-result',
      cursorReferences: [
        {
          name: 'x'.repeat(20_000),
          context: 4,
        },
      ],
    });

    expect(() =>
      JSON.parse(String(attributes['debug.snapshot'])),
    ).not.toThrow();
    expect(String(attributes['debug.snapshot']).length).toBeLessThanOrEqual(
      16_000,
    );
  });
});
