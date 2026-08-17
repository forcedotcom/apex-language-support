/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { WorkerFixtures, TestFixtures } from './desktopFixtureTypes';
import {
  test as base,
  _electron as electron,
  type ElectronApplication,
} from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { dismissStartupPrompts, filterErrors } from '../shared/utils/helpers';
import { resolveRepoRoot } from '../shared/utils/repoRoot';
import { createDesktopTestWorkspace } from './desktopWorkspace';
import { WORKBENCH } from '../shared/utils/locators';
import { getDesktopExtensionsDir } from '../shared/config/downloadVSCode';

type CreateDesktopTestOptions = {
  /** __dirname from the calling fixture file (e.g., 'e2e-tests/fixtures') */
  fixturesDir: string;
  /** Additional extension directory paths to load alongside the Apex extension */
  additionalExtensionDirs?: string[];
  /** Optional user settings to write to User/settings.json */
  userSettings?: Record<string, unknown>;
};

const resolveDesktopExecutable = async (
  downloadedPath: string,
): Promise<string> => {
  if (process.platform !== 'darwin') {
    return downloadedPath;
  }

  try {
    await fs.access(downloadedPath);
    return downloadedPath;
  } catch {
    // VS Code 1.133 renamed the macOS application executable from Electron to Code.
    const codeExecutable = path.join(path.dirname(downloadedPath), 'Code');
    await fs.access(codeExecutable);
    return codeExecutable;
  }
};

const closeDesktopApp = async (
  electronApp: ElectronApplication,
): Promise<void> => {
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const closedGracefully = await Promise.race([
    electronApp.close().then(
      () => true,
      () => false,
    ),
    new Promise<boolean>((resolve) => {
      closeTimer = setTimeout(() => resolve(false), 5000);
    }),
  ]);

  if (closeTimer) {
    clearTimeout(closeTimer);
  }

  if (!closedGracefully) {
    // VS Code can leave the extension host alive after a failed test. Do not
    // let that consume the remainder of Playwright's per-test timeout.
    try {
      electronApp.process().kill();
    } catch {
      // The process may have exited between the timeout and the kill attempt.
    }
  }
};

/** Creates a Playwright test instance configured for desktop Electron testing */
export const createDesktopTest = (options: CreateDesktopTestOptions) => {
  const { fixturesDir, additionalExtensionDirs = [], userSettings } = options;

  const test = base.extend<TestFixtures, WorkerFixtures>({
    vscodeExecutable: [
      async ({}, use): Promise<void> => {
        const repoRoot = resolveRepoRoot(fixturesDir);
        const cachePath = path.join(repoRoot, '.vscode-test');
        const downloadedPath = await downloadAndUnzipVSCode({ cachePath });
        const executablePath = await resolveDesktopExecutable(downloadedPath);
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
      use,
    ): Promise<void> => {
      const userDataDir = path.join(workspaceDir, '.vscode-test-user-data');
      await fs.mkdir(userDataDir, { recursive: true });
      const userSettingsDir = path.join(userDataDir, 'User');
      await fs.mkdir(userSettingsDir, { recursive: true });
      await fs.writeFile(
        path.join(userSettingsDir, 'settings.json'),
        JSON.stringify(
          {
            'workbench.startupEditor': 'none',
            'workbench.welcomePage.walkthroughs.openOnInstall': false,
            'workbench.tips.enabled': false,
            ...userSettings,
          },
          null,
          2,
        ),
      );
      const repoRoot = resolveRepoRoot(fixturesDir);
      // Global setup installs only Salesforce Services here. Keeping the
      // directory isolated from the user's extensions gives development mode
      // its required dependency without enabling unrelated extensions.
      const extensionsDir = getDesktopExtensionsDir(repoRoot);
      const extensionPath = path.join(
        repoRoot,
        'packages',
        'apex-lsp-vscode-extension',
      );

      const videosDir = path.join(
        repoRoot,
        'e2e-tests',
        'test-results',
        'videos',
      );
      await fs.mkdir(videosDir, { recursive: true });

      const extensionArgs = [
        extensionPath,
        ...additionalExtensionDirs.map((dir) =>
          path.isAbsolute(dir) ? dir : path.resolve(repoRoot, dir),
        ),
      ].map((p) => `--extensionDevelopmentPath=${p}`);

      const launchArgs = [
        `--user-data-dir=${userDataDir}`,
        `--extensions-dir=${extensionsDir}`,
        ...extensionArgs,
        '--disable-workspace-trust',
        '--no-sandbox',
        workspaceDir,
      ];

      // Strip ELECTRON_RUN_AS_NODE before launching. When the test runner is
      // itself a child of an Electron process (VS Code's extension host, the
      // Claude Code CLI agent, etc.), this var is inherited and forces the
      // launched VS Code binary into Node mode — its argv parser then rejects
      // Playwright's --remote-debugging-port=0 / --inspect=0 with
      // "bad option: --remote-debugging-port=0" and the launch fails.
      // See microsoft/playwright#39922.
      const childEnv = { ...process.env, VSCODE_DESKTOP: '1' } as Record<
        string,
        string
      >;
      delete childEnv.ELECTRON_RUN_AS_NODE;

      const electronApp = await electron.launch({
        executablePath: vscodeExecutable,
        args: launchArgs,
        env: childEnv,
        timeout: 60_000,
        recordVideo: {
          dir: videosDir,
          size: { width: 1920, height: 1080 },
        },
      });

      try {
        await use(electronApp);
      } finally {
        await closeDesktopApp(electronApp);
      }
    },

    page: async ({ electronApp }, use) => {
      const page = await electronApp.firstWindow();

      await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);

      page.on('console', (msg) => {
        if (
          msg.type() !== 'error' ||
          filterErrors([{ text: msg.text(), url: msg.location()?.url || '' }])
            .length === 0
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

      await dismissStartupPrompts(page);

      await use(page);
    },
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (process.env.DEBUG_MODE && testInfo.status !== 'passed') {
      console.log(
        '\n🔍 DEBUG_MODE: Test failed - pausing to keep VS Code window open.',
      );
      console.log(
        'Press Resume in Playwright Inspector or close VS Code window to continue.',
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
