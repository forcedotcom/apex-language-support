/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { existsSync, unlinkSync } from 'node:fs';
import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';

export default async (): Promise<void> => {
  if (platform() !== 'win32') return;

  const snapshotPath = fileURLToPath(
    new URL(
      '../test/accuracy/__snapshots__/semantic-errors.test.ts.snap',
      import.meta.url,
    ),
  );
  if (existsSync(snapshotPath)) unlinkSync(snapshotPath);
};
