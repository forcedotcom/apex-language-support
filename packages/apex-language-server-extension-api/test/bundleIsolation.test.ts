/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const rootArtifacts = ['index.js', 'index.d.ts'];
const packageDirectory = resolve(__dirname, '..');

describe('root package isolation', () => {
  it('does not expose Effect through a published root artifact', async () => {
    const contents = await Promise.all(
      rootArtifacts.map((artifact) =>
        readFile(resolve(packageDirectory, 'out', artifact), 'utf8'),
      ),
    );

    expect(contents).toEqual(
      expect.not.arrayContaining([expect.stringContaining('effect')]),
    );
  });
});
