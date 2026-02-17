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
  const workspaceDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'apex-e2e-desktop-')
  );

  await setupTestWorkspace({
    workspacePath: workspaceDir,
    verbose: false,
  });

  return workspaceDir;
};
