/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LayerEnrichmentService } from '../../src/services/LayerEnrichmentService';

describe('LayerEnrichmentService', () => {
  const service = new LayerEnrichmentService({} as never, {} as never);

  it.each([
    ['public-api', ['protected', 'private', 'full']],
    ['private', ['full']],
  ] as const)(
    'adds the full body layer when enriching %s detail',
    (currentLevel, expectedLayers) => {
      expect((service as any).getLayersToApply(currentLevel, 'full')).toEqual(
        expectedLayers,
      );
    },
  );
});
