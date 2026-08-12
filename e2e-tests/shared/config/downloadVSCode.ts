/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  downloadAndUnzipVSCode,
  runVSCodeCommand,
} from '@vscode/test-electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { resolveRepoRoot } from '../utils/repoRoot';

export const DESKTOP_SERVICES_EXTENSION_ID =
  'salesforce.salesforcedx-vscode-services';

export const getDesktopExtensionsDir = (repoRoot: string): string =>
  path.join(repoRoot, '.vscode-test', 'extensions');

/**
 * Global setup function that downloads VS Code before tests run.
 * This prevents simultaneous downloads when multiple workers start.
 */
export default async function (): Promise<void> {
  const repoRoot = resolveRepoRoot(__dirname);
  const cachePath = path.join(repoRoot, '.vscode-test');
  const extensionsDir = getDesktopExtensionsDir(repoRoot);
  await downloadAndUnzipVSCode({ cachePath });
  await fs.mkdir(extensionsDir, { recursive: true });
  await runVSCodeCommand(
    [
      '--install-extension',
      DESKTOP_SERVICES_EXTENSION_ID,
      `--extensions-dir=${extensionsDir}`,
      '--force',
    ],
    { cachePath },
  );
}
