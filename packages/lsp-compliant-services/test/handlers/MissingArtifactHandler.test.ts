/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { MissingArtifactHandler } from '../../src/handlers/MissingArtifactHandler';

describe('MissingArtifactHandler provenance', () => {
  it('rejects name-only input before the direct client path', async () => {
    const connection = { sendRequest: jest.fn() };
    const handler = new MissingArtifactHandler(getLogger(), connection);

    await expect(
      handler.handleFindMissingArtifact({
        identifiers: [{ name: 'MissingClass' }],
        origin: {
          uri: 'file:///Caller.cls',
          requestKind: 'definition',
        },
        mode: 'blocking',
      } as any),
    ).resolves.toEqual({ notFound: true });
    expect(connection.sendRequest).not.toHaveBeenCalled();
  });
});
