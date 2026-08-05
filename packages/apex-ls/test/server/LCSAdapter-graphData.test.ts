/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LCSAdapter } from '../../src/server/LCSAdapter';
import type { GraphDataParams } from '@salesforce/apex-lsp-shared';

describe('LCSAdapter graph data routing', () => {
  it('queries the data-owner graph when worker topology is available', async () => {
    const graph = {
      data: {
        nodes: [{ id: 'Property__c', name: 'Property__c' }],
        edges: [],
      },
    };
    const queryGraphData = jest.fn().mockResolvedValue(graph);
    const adapter = Object.create(LCSAdapter.prototype) as {
      workerDispatcher?: {
        isAvailable(): boolean;
        queryGraphData(params: GraphDataParams): Promise<unknown>;
      };
      processGraphData(params: GraphDataParams): Promise<unknown>;
    };
    adapter.workerDispatcher = {
      isAvailable: () => true,
      queryGraphData,
    };
    const params: GraphDataParams = {
      type: 'all',
      includeMetadata: true,
    };

    await expect(adapter.processGraphData(params)).resolves.toBe(graph);
    expect(queryGraphData).toHaveBeenCalledWith(params);
  });
});
