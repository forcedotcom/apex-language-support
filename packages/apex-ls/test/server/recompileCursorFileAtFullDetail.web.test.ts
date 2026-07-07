/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Web-platform mirror of recompileCursorFileAtFullDetail.node.test.ts.
 *
 * worker.platform.ts (node) and worker.platform.web.ts (web) hand-duplicate the
 * content-guard + full-detail recompile logic; the node test alone left the web
 * copy uncovered, so a web-only regression in that byte-identical guard would go
 * unnoticed. This pins the web copy's contract: `undefined` skips the recompile
 * (returns false), while `''` and real content are content-present and CAN be
 * recompiled (return true) — the undefined-vs-blank distinction of the #531 bug
 * class.
 *
 * worker.platform.web runs `self.addEventListener(...)` at module top level to
 * await its ports, so a minimal `self` is shimmed before the import to let the
 * module load under the node test environment.
 */

// Shim the worker `self` the web module wires a message listener onto at import.
(globalThis as { self?: unknown }).self = {
  addEventListener: () => {},
} as unknown;

import { Effect } from 'effect';
import { recompileCursorFileAtFullDetail } from '../../src/worker.platform.web';
import type { RequestServices } from '@salesforce/apex-lsp-compliant-services';

const URI = 'file:///workspace/RefUtil.cls';
const CLASS_BODY = `public class RefUtil {
  public String greet(String input) {
    return input;
  }
}`;

describe('recompileCursorFileAtFullDetail content guard (web)', () => {
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

    expect(recompiled).toBe(false);
    expect(addSymbolTable).not.toHaveBeenCalled();
    expect(resolveCrossFileReferencesForFile).not.toHaveBeenCalled();
  });

  it('returns true for an empty string (a valid zero-length document)', async () => {
    const recompiled = await recompileCursorFileAtFullDetail(svc, URI, '');

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
