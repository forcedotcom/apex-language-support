/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Language Server Module Tests
 */

// The shared vscode mock omits env/UIKind; provide them for environment detection.
jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  env: { uiKind: 1, language: 'en' },
  UIKind: { Desktop: 1, Web: 2 },
}));

// vscode-languageclient pulls in browser/node globals that are absent under Jest;
// stub the surface language-server.ts touches at import time.
jest.mock('vscode-languageclient', () => ({
  Trace: { Off: 0, Messages: 1, Verbose: 2 },
  State: { Stopped: 1, Starting: 2, Running: 3 },
}));
jest.mock('vscode-languageclient/node', () => ({
  Trace: { Off: 0, Messages: 1, Verbose: 2 },
  State: { Stopped: 1, Starting: 2, Running: 3 },
  LanguageClient: class {},
}));

import * as vscode from 'vscode';
import { detectEnvironment } from '../src/language-server';

describe('detectEnvironment', () => {
  const originalUiKind = vscode.env.uiKind;

  afterEach(() => {
    (vscode.env as { uiKind: number }).uiKind = originalUiKind;
    delete (globalThis as Record<string, unknown>).__APEX_LS_TARGET__;
  });

  describe('when a bundle target is injected (esbuild define)', () => {
    it("returns 'desktop' for the Node bundle even when the UI is a browser (code-server)", () => {
      // code-server: Node extension host (Node bundle) but browser-rendered UI.
      (globalThis as Record<string, unknown>).__APEX_LS_TARGET__ = 'desktop';
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Web;

      expect(detectEnvironment()).toBe('desktop');
    });

    it("returns 'web' for the browser bundle (vscode.dev web-worker host)", () => {
      (globalThis as Record<string, unknown>).__APEX_LS_TARGET__ = 'web';
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Web;

      expect(detectEnvironment()).toBe('web');
    });
  });

  describe('fallback when no bundle target is injected (unbundled/tsc)', () => {
    it("returns 'web' when uiKind is Web", () => {
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Web;
      expect(detectEnvironment()).toBe('web');
    });

    it("returns 'desktop' when uiKind is Desktop", () => {
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Desktop;
      expect(detectEnvironment()).toBe('desktop');
    });
  });
});
