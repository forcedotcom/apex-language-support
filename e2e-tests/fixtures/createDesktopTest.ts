/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { WorkerFixtures, TestFixtures } from './desktopFixtureTypes';
import { test as base, _electron as electron } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { filterErrors } from '../shared/utils/helpers';
import { resolveRepoRoot } from '../shared/utils/repoRoot';
import { createDesktopTestWorkspace } from './desktopWorkspace';
import { WORKBENCH } from '../shared/utils/locators';

type CreateDesktopTestOptions = {
  /** __dirname from the calling fixture file (e.g., 'e2e-tests/fixtures') */
  fixturesDir: string;
  /** Additional extension directory paths to load alongside the Apex extension */
  additionalExtensionDirs?: string[];
  /** When false, do not pass --disable-extensions. Default true. */
  disableOtherExtensions?: boolean;
  /** Optional user settings to write to User/settings.json */
  userSettings?: Record<string, unknown>;
};

/** Creates a Playwright test instance configured for desktop Electron testing */
export const createDesktopTest = (options: CreateDesktopTestOptions) => {
  const {
    fixturesDir,
    additionalExtensionDirs = [],
    disableOtherExtensions = true,
    userSettings,
  } = options;

  const test = base.extend<TestFixtures, WorkerFixtures>({
    vscodeExecutable: [
      async ({}, use): Promise<void> => {
        const repoRoot = resolveRepoRoot(fixturesDir);
        const cachePath = path.join(repoRoot, '.vscode-test');
        const executablePath = await downloadAndUnzipVSCode({ cachePath });
        await use(executablePath);
      },
      { scope: 'worker' },
    ],

    workspaceDir: async ({}, use): Promise<void> => {
      const dir = await createDesktopTestWorkspace();
      await use(dir);
    },

    electronApp: async (
      { vscodeExecutable, workspaceDir },
      use
    ): Promise<void> => {
      const userDataDir = path.join(workspaceDir, '.vscode-test-user-data');
      await fs.mkdir(userDataDir, { recursive: true });
      if (
        userSettings !== undefined &&
        Object.keys(userSettings).length > 0
      ) {
        const userSettingsDir = path.join(userDataDir, 'User');
        await fs.mkdir(userSettingsDir, { recursive: true });
        await fs.writeFile(
          path.join(userSettingsDir, 'settings.json'),
          JSON.stringify(userSettings, null, 2)
        );
      }
      const extensionsDir = path.join(workspaceDir, '.vscode-test-extensions');
      await fs.mkdir(extensionsDir, { recursive: true });

      const repoRoot = resolveRepoRoot(fixturesDir);
      const extensionPath = path.join(
        repoRoot,
        'packages',
        'apex-lsp-vscode-extension',
        'dist'
      );

      const videosDir = path.join(repoRoot, 'e2e-tests', 'test-results', 'videos');
      await fs.mkdir(videosDir, { recursive: true });

      const extensionArgs = [
        extensionPath,
        ...additionalExtensionDirs.map((dir) =>
          path.isAbsolute(dir) ? dir : path.resolve(repoRoot, dir)
        ),
      ].map((p) => `--extensionDevelopmentPath=${p}`);

      const launchArgs = [
        `--user-data-dir=${userDataDir}`,
        `--extensions-dir=${extensionsDir}`,
        ...extensionArgs,
        ...(disableOtherExtensions ? ['--disable-extensions'] : []),
        '--disable-workspace-trust',
        '--no-sandbox',
        workspaceDir,
      ];

      const electronApp = await electron.launch({
        executablePath: vscodeExecutable,
        args: launchArgs,
        env: { ...process.env, VSCODE_DESKTOP: '1' } as Record<string, string>,
        timeout: 60_000,
        recordVideo: {
          dir: videosDir,
          size: { width: 1920, height: 1080 },
        },
      });

      try {
        await use(electronApp);
      } finally {
        try {
          await electronApp.close();
        } catch {
          // Ignore cleanup errors
        }
      }
    },

    page: async ({ electronApp }, use) => {
      const page = await electronApp.firstWindow();

      await page.context().grantPermissions([
        'clipboard-read',
        'clipboard-write',
      ]);

      page.on('console', (msg) => {
        if (
          msg.type() !== 'error' ||
          filterErrors([
            { text: msg.text(), url: msg.location()?.url || '' },
          ]).length === 0
        ) {
          return;
        }
        console.log(`[Electron Console Error] ${msg.text()}`);
        const { url, lineNumber } = msg.location() ?? {};
        if (url) {
          console.log(`  at ${url}:${lineNumber}`);
        }
      });

      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.waitForSelector(WORKBENCH, { timeout: 60_000 });
      await use(page);
    },
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (process.env.DEBUG_MODE && testInfo.status !== 'passed') {
      console.log(
        '\n🔍 DEBUG_MODE: Test failed - pausing to keep VS Code window open.'
      );
      console.log(
        'Press Resume in Playwright Inspector or close VS Code window to continue.'
      );
      await page.pause();
    }

    const video = page.video();
    if (video) {
      const videoPath = await video.path();
      const safeName = testInfo.titlePath
        .join('-')
        .replaceAll(/[^a-zA-Z0-9-]/g, '_');
      const newPath = path.join(path.dirname(videoPath), `${safeName}.webm`);
      await fs.rename(videoPath, newPath).catch(() => {});
    }
  });

  return test;
};
