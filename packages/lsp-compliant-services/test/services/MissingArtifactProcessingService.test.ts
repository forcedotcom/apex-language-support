/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { MissingArtifactProcessingService } from '../../src/services/MissingArtifactProcessingService';

describe('MissingArtifactProcessingService provenance', () => {
  it('rejects a name-only queued request before contacting the client', async () => {
    const service = new MissingArtifactProcessingService(getLogger());

    await expect(
      service.processFindMissingArtifact({
        identifiers: [{ name: 'MissingClass' }],
        origin: {
          uri: 'file:///Caller.cls',
          requestKind: 'references',
        },
        mode: 'blocking',
      } as any),
    ).resolves.toEqual({ notFound: true });
  });
});
