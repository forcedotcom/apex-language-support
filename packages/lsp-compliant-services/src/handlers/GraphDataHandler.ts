/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { dispatch } from '../utils/handlerUtil';
import {
  IGraphDataProcessor,
  GraphDataParams,
  GraphDataResponse,
} from '../services/GraphDataProcessingService';

/**
 * Handler for graph data requests
 */
export class GraphDataHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly graphDataProcessor: IGraphDataProcessor,
  ) {}

  /**
   * Handle graph data request
   * @param params The graph data parameters
   * @returns Graph data response
   */
  public async handleGraphData(
    params: GraphDataParams,
  ): Promise<GraphDataResponse> {
    this.logger.info(
      `GraphDataHandler: Handling graph data request: ${JSON.stringify(params)}`,
    );

    try {
      const result = await dispatch(
        this.graphDataProcessor.processGraphData(params),
        'Error processing graph data request',
      );
      this.logger.info(
        `GraphDataHandler: Successfully processed request, result type: ${typeof result}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `GraphDataHandler: Error in handleGraphData: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Handle complete graph data request
   * @returns Complete graph data
   */
  public async handleCompleteGraphData(): Promise<GraphDataResponse> {
    return this.handleGraphData({ type: 'all' });
  }

  /**
   * Handle file-specific graph data request
   * @param fileUri The file URI
   * @returns File-specific graph data
   */
  public async handleFileGraphData(
    fileUri: string,
  ): Promise<GraphDataResponse> {
    return this.handleGraphData({ type: 'file', fileUri });
  }

  /**
   * Handle type-specific graph data request
   * @param symbolType The symbol type
   * @returns Type-specific graph data
   */
  public async handleTypeGraphData(
    symbolType: string,
  ): Promise<GraphDataResponse> {
    return this.handleGraphData({ type: 'type', symbolType });
  }
}
