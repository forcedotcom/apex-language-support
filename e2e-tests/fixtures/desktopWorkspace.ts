/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { setupTestWorkspace } from '../utils/setup';

/** Create a temporary workspace directory with Apex sample files for desktop tests */
export const createDesktopTestWorkspace = async (): Promise<string> => {
  // VS Code creates its main IPC socket below --user-data-dir. macOS limits
  // Unix-domain socket paths to 103 characters, while os.tmpdir() commonly
  // expands to a long /var/folders/... path. Use the short /tmp alias so the
  // nested test user-data directory remains launchable.
  const tempRoot = process.platform === 'darwin' ? '/tmp' : os.tmpdir();
  const workspaceDir = await fs.mkdtemp(
    path.join(tempRoot, 'apex-e2e-desktop-'),
  );

  await setupTestWorkspace({
    workspacePath: workspaceDir,
    verbose: false,
  });

  return workspaceDir;
};
