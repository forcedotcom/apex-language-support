/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Content-guard coverage for recompileCursorFileAtFullDetail (node platform).
 *
 * The data-owner serves cursor files at 'public-api' (method bodies stripped),
 * so an in-body cursor resolves to nothing and Find References returns [].
 * recompileCursorFileAtFullDetail re-parses the live document at full detail to
 * restore those in-body references. Its content gate MUST distinguish a
 * truly-absent document (`undefined` → skip, return false) from an empty-but-
 * present one (`''` → a valid zero-length file that CAN be recompiled, return
 * true). A naive `!content` falsy check would conflate the two and leave a
 * freshly-opened empty `.cls` at public-api detail — the same undefined-vs-blank
 * bug class #531 fixed elsewhere in the stack.
 *
 * These tests inject a stubbed RequestServices (symbol manager as jest mocks,
 * matching loadDependentsForReferences.node.test.ts) so the recompile path runs
 * against real parser output without a worker or storage.
 */

import { Effect } from 'effect';
import { recompileCursorFileAtFullDetail } from '../../src/worker.platform';
import type { RequestServices } from '@salesforce/apex-lsp-compliant-services';

const URI = 'file:///workspace/RefUtil.cls';
const CLASS_BODY = `public class RefUtil {
  public String greet(String input) {
    return input;
  }
}`;

describe('recompileCursorFileAtFullDetail content guard', () => {
  let addSymbolTable: jest.Mock;
  let resolveCrossFileReferencesForFile: jest.Mock;
  let svc: RequestServices;

  beforeEach(() => {
    addSymbolTable = jest.fn(() => Effect.void);
    resolveCrossFileReferencesForFile = jest.fn(() => Effect.void);
    svc = {
      symbolManager: { addSymbolTable, resolveCrossFileReferencesForFile },
    } as unknown as RequestServices;
  });

  it('returns false and skips recompile when content is undefined', async () => {
    const recompiled = await recompileCursorFileAtFullDetail(
      svc,
      URI,
      undefined,
    );

    // No text → nothing to parse; the public-api graph is left untouched.
    expect(recompiled).toBe(false);
    expect(addSymbolTable).not.toHaveBeenCalled();
    expect(resolveCrossFileReferencesForFile).not.toHaveBeenCalled();
  });

  it('returns true for an empty string (a valid zero-length document)', async () => {
    const recompiled = await recompileCursorFileAtFullDetail(svc, URI, '');

    // '' is content-present: the guard must NOT reject it as falsy.
    expect(recompiled).toBe(true);
    expect(addSymbolTable).toHaveBeenCalledTimes(1);
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledWith(URI);
  });

  it('returns true for real class-body content', async () => {
    const recompiled = await recompileCursorFileAtFullDetail(
      svc,
      URI,
      CLASS_BODY,
    );

    expect(recompiled).toBe(true);
    expect(addSymbolTable).toHaveBeenCalledTimes(1);
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledWith(URI);
  });

  it('can compile for cursor-only resolution without materializing file edges', async () => {
    const recompiled = await recompileCursorFileAtFullDetail(
      svc,
      URI,
      CLASS_BODY,
      { resolveCrossFileReferences: false },
    );

    expect(recompiled).toBe(true);
    expect(addSymbolTable).toHaveBeenCalledTimes(1);
    expect(resolveCrossFileReferencesForFile).not.toHaveBeenCalled();
  });

  it('stamps parseCompleteness=incomplete for a syntax-broken source (W-23631128)', async () => {
    // A malformed source RECOVERS a full-detail table, but its parse dropped
    // declarations. This full table is written back to the data owner, where
    // CheckMemberConflicts reads it — so it must be marked incomplete here (the
    // pool's only full-detail producer) or the owner would trust a truncated
    // member set and could approve a destructive rename. Only SYNTAX errors mark
    // incompleteness; benign semantic errors must not.
    const broken = `public class Broken {
  public String keep;
  public void bad() {
    visible = ;
  }
}`;
    const recompiled = await recompileCursorFileAtFullDetail(svc, URI, broken);
    expect(recompiled).toBe(true);
    expect(addSymbolTable).toHaveBeenCalledTimes(1);
    const table = addSymbolTable.mock.calls[0][0] as {
      getMetadata: () => { parseCompleteness: string };
    };
    expect(table.getMetadata().parseCompleteness).toBe('incomplete');
  });

  it('stamps parseCompleteness=complete for a clean source with a benign semantic error (W-23631128)', async () => {
    // Referencing an undeclared cross-file type yields a benign SEMANTIC error
    // but no syntax error — the parse is structurally complete and must NOT be
    // marked incomplete (that would over-decline valid renames).
    const clean = `public class Clean {
  public String keep;
  public void use() {
    SomeExternalType t = new SomeExternalType();
  }
}`;
    const recompiled = await recompileCursorFileAtFullDetail(svc, URI, clean);
    expect(recompiled).toBe(true);
    expect(addSymbolTable).toHaveBeenCalledTimes(1);
    const table = addSymbolTable.mock.calls[0][0] as {
      getMetadata: () => { parseCompleteness: string };
    };
    expect(table.getMetadata().parseCompleteness).not.toBe('incomplete');
  });

  it('reuses unchanged full-detail content in the same worker', async () => {
    let currentTable: unknown;
    addSymbolTable.mockImplementation((table: unknown) => {
      currentTable = table;
      return Effect.void;
    });
    (svc.symbolManager as any).getSymbolTableForFile = jest.fn(
      async () => currentTable,
    );
    const firstTelemetry: { reused?: boolean } = {};
    const secondTelemetry: { reused?: boolean } = {};

    await recompileCursorFileAtFullDetail(svc, URI, CLASS_BODY, {
      resolveCrossFileReferences: false,
      reuseUnchangedContent: true,
      sourceVersion: 7,
      telemetry: firstTelemetry,
    });
    await recompileCursorFileAtFullDetail(svc, URI, CLASS_BODY, {
      resolveCrossFileReferences: false,
      reuseUnchangedContent: true,
      sourceVersion: 7,
      telemetry: secondTelemetry,
    });

    expect(addSymbolTable).toHaveBeenCalledTimes(1);
    expect(firstTelemetry.reused).toBeUndefined();
    expect(secondTelemetry.reused).toBe(true);
  });

  it('does not reuse compilation after the symbol-table instance is replaced', async () => {
    let currentTable: unknown;
    addSymbolTable.mockImplementation((table: unknown) => {
      currentTable = table;
      return Effect.void;
    });
    (svc.symbolManager as any).getSymbolTableForFile = jest.fn(
      async () => currentTable,
    );

    await recompileCursorFileAtFullDetail(svc, URI, CLASS_BODY, {
      resolveCrossFileReferences: false,
      reuseUnchangedContent: true,
      sourceVersion: 7,
    });
    currentTable = { replacement: true };
    const telemetry: { reused?: boolean } = {};
    await recompileCursorFileAtFullDetail(svc, URI, CLASS_BODY, {
      resolveCrossFileReferences: false,
      reuseUnchangedContent: true,
      sourceVersion: 7,
      telemetry,
    });

    expect(addSymbolTable).toHaveBeenCalledTimes(2);
    expect(telemetry.reused).toBeUndefined();
  });
});
