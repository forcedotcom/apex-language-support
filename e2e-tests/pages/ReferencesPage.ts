/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the VS Code "Find All References" peek widget.
 *
 * VS Code surfaces find-all-references results in a peek widget (Shift+F12)
 * with a tree of files (each file may contain one or more matching references)
 * and a preview pane for the currently selected reference.
 *
 * Selectors are role-based to survive VS Code DOM-class churn:
 *  - `tree[name="References"]` is the references list
 *  - `tree[name="References"] >> ..` (its zone container) is the peek widget
 *  - the announcement region exposes "Found N symbols in M files" via aria-live
 */
export class ReferencesPage extends BasePage {
  private readonly referencesTree: Locator;
  private readonly referenceItems: Locator;
  private readonly fileGroupItems: Locator;
  private readonly defaultTimeout: number;

  constructor(page: Page) {
    super(page);
    this.referencesTree = page.getByRole('tree', { name: 'References' });
    // VS Code's references tree shape is dynamic:
    //  - Multi-file results: file group headers at level=1, reference rows at level=2.
    //    File header aria-label looks like "N symbols in <filename>, full path ...".
    //  - Single-file results: file header is omitted; reference rows are at level=1.
    // Reference rows always include "on line N at column N" in their aria-label.
    // File group headers always include "symbols in <filename>".
    this.referenceItems = this.referencesTree.locator(
      '[role="treeitem"][aria-label*="on line "][aria-label*="at column "]',
    );
    // File-group aria-labels can be either "N symbols in <file>" (plural) or
    // "1 symbol in <file>" (singular). Match both.
    this.fileGroupItems = this.referencesTree.locator(
      '[role="treeitem"][aria-label*="symbol in "], [role="treeitem"][aria-label*="symbols in "]',
    );
    this.defaultTimeout = this.isDesktopMode ? 30000 : 15000;
  }

  /**
   * Wait for the references peek widget to become visible.
   * @param timeout - optional override; defaults to mode-aware timeout
   */
  async waitForVisible(timeout?: number): Promise<void> {
    await this.referencesTree.first().waitFor({
      state: 'visible',
      timeout: timeout ?? this.defaultTimeout,
    });
  }

  /**
   * Whether the references peek widget is currently visible.
   */
  async isVisible(): Promise<boolean> {
    return await this.referencesTree.first().isVisible();
  }

  /**
   * Count the reference matches in the tree.
   *
   * The peek widget collapses some file groups by default, which removes their
   * child reference rows from the DOM. To get the total count reliably:
   *  - When file group headers exist, sum the "N symbols" tally from each
   *    group's aria-label (works whether the group is expanded or collapsed).
   *  - When no groups are present (single-file flat layout), count visible
   *    reference rows directly.
   */
  async getReferenceCount(): Promise<number> {
    if (!(await this.isVisible())) return 0;
    const groupCount = await this.fileGroupItems.count();
    if (groupCount > 0) {
      let total = 0;
      for (let i = 0; i < groupCount; i++) {
        const aria =
          (await this.fileGroupItems.nth(i).getAttribute('aria-label')) ?? '';
        // "N symbols in <filename>, full path ..." (or "1 symbol in ...")
        const match = aria.match(/^(\d+)\s+symbol/i);
        if (match) total += parseInt(match[1], 10);
      }
      if (total > 0) return total;
    }
    return await this.referenceItems.count();
  }

  /**
   * Count of file group rows. When all results are within a single file,
   * VS Code omits the file header — return 1 in that case if any references
   * are present.
   */
  async getFileCount(): Promise<number> {
    if (!(await this.isVisible())) return 0;
    const groups = await this.fileGroupItems.count();
    if (groups > 0) return groups;
    const refs = await this.referenceItems.count();
    return refs > 0 ? 1 : 0;
  }

  /**
   * Return the list of file names shown in the peek widget. When file groups
   * exist, reads each group's aria-label. When results are flat (single file),
   * extracts the filename from the reference rows themselves.
   */
  async getFileNames(): Promise<string[]> {
    await this.waitForVisible();
    const groupCount = await this.fileGroupItems.count();
    if (groupCount > 0) {
      const names: string[] = [];
      for (let i = 0; i < groupCount; i++) {
        const aria =
          (await this.fileGroupItems.nth(i).getAttribute('aria-label')) ?? '';
        // "N symbols in <filename>, full path ..."
        const match = aria.match(/symbols?\s+in\s+([^,]+)/i);
        if (match) names.push(match[1].trim());
      }
      return names;
    }
    // Flat results — extract filename from reference-row aria-labels:
    // "<snippet> in <filename> on line N at column N"
    const refCount = await this.referenceItems.count();
    const names = new Set<string>();
    for (let i = 0; i < refCount; i++) {
      const aria =
        (await this.referenceItems.nth(i).getAttribute('aria-label')) ?? '';
      const match = aria.match(/in\s+(\S+\.cls)\s+on\s+line/i);
      if (match) names.add(match[1].trim());
    }
    return Array.from(names);
  }

  /**
   * Assert the title eventually parses to the expected reference count.
   * Polls because the LSP can stream additional results into the peek widget.
   */
  async expectReferenceCount(
    expected: number | { min: number },
    timeout?: number,
  ): Promise<void> {
    const effectiveTimeout = timeout ?? this.defaultTimeout;
    await expect(async () => {
      const count = await this.getReferenceCount();
      if (typeof expected === 'number') {
        expect(count).toBe(expected);
      } else {
        expect(count).toBeGreaterThanOrEqual(expected.min);
      }
    }).toPass({ timeout: effectiveTimeout });
  }

  /**
   * Assert the title reflects the expected file count.
   */
  async expectFileCount(
    expected: number | { min: number },
    timeout?: number,
  ): Promise<void> {
    const effectiveTimeout = timeout ?? this.defaultTimeout;
    await expect(async () => {
      const count = await this.getFileCount();
      if (typeof expected === 'number') {
        expect(count).toBe(expected);
      } else {
        expect(count).toBeGreaterThanOrEqual(expected.min);
      }
    }).toPass({ timeout: effectiveTimeout });
  }

  /**
   * Assert that a specific filename appears in the peek widget's file list.
   */
  async expectFilePresent(filename: string, timeout?: number): Promise<void> {
    const effectiveTimeout = timeout ?? this.defaultTimeout;
    await expect(async () => {
      const names = await this.getFileNames();
      expect(
        names,
        `Expected file "${filename}" in references peek; got: ${names.join(', ')}`,
      ).toContain(filename);
    }).toPass({ timeout: effectiveTimeout });
  }

  /**
   * Close the references peek widget.
   */
  async close(): Promise<void> {
    if (!(await this.isVisible())) return;
    for (let i = 0; i < 3; i++) {
      await this.page.keyboard.press('Escape');
      const stillVisible = await this.referencesTree
        .first()
        .isVisible()
        .catch(() => false);
      if (!stillVisible) return;
    }
  }
}
