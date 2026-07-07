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
});
