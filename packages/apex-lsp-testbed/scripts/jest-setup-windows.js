/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Jest global setup script to clean up snapshots on Windows
 * Since semantic error tests are skipped on Windows, we delete their snapshots
 * to prevent obsolete snapshot warnings.
 */

module.exports = async () => {
  const { platform } = require('os');
  const { existsSync, unlinkSync } = require('fs');
  const { join } = require('path');

  if (platform() === 'win32') {
    const snapshotPath = join(
      __dirname,
      '../test/accuracy/__snapshots__/semantic-errors.test.ts.snap',
    );

    if (existsSync(snapshotPath)) {
      try {
        unlinkSync(snapshotPath);
        console.log('Deleted obsolete snapshots for skipped Windows tests');
      } catch (error) {
        console.warn(`Failed to delete snapshot file: ${error.message}`);
      }
    }
  }
};
