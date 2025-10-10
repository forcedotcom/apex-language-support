/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ApexSymbolProcessingManager } from '@salesforce/apex-lsp-parser-ast';
import {
  GraphData,
  GraphNode,
  GraphEdge,
  FileGraphData,
  TypeGraphData,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Parameters for graph data requests
 */
export interface GraphDataParams {
  /** Type of graph data to retrieve */
  type: 'all' | 'file' | 'type';
  /** File URI (required for 'file' type) */
  fileUri?: string;
  /** Symbol type (required for 'type' type) */
  symbolType?: string;
  /** Include metadata in response */
  includeMetadata?: boolean;
}

/**
 * Response for graph data requests
 */
export interface GraphDataResponse {
  /** The requested graph data */
  data: GraphData | FileGraphData | TypeGraphData;
  /** Request metadata */
  metadata: {
    requestType: string;
    timestamp: number;
    processingTime: number;
  };
}

/**
 * Interface for graph data processing functionality
 */
export interface IGraphDataProcessor {
  /**
   * Process a graph data request
   * @param params The graph data parameters
   * @returns Graph data response
   */
  processGraphData(params: GraphDataParams): Promise<GraphDataResponse>;
}

/**
 * Service for processing graph data requests using ApexSymbolManager
 */
export class GraphDataProcessingService implements IGraphDataProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager = symbolManager || this.getSymbolManager();
  }

  /**
   * Process a graph data request
   */
  public async processGraphData(
    params: GraphDataParams,
  ): Promise<GraphDataResponse> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Processing graph data request: ${JSON.stringify(params)}`,
      );

      let data: GraphData | FileGraphData | TypeGraphData;

      switch (params.type) {
        case 'all':
          data = this.symbolManager.getGraphData();
          break;
        case 'file':
          if (!params.fileUri) {
            throw new Error('File URI is required for file graph data');
          }
          data = this.symbolManager.getGraphDataForFile(params.fileUri);
          break;
        case 'type':
          if (!params.symbolType) {
            throw new Error('Symbol type is required for type graph data');
          }
          data = this.symbolManager.getGraphDataByType(params.symbolType);
          break;
        default:
          throw new Error(`Unsupported graph data type: ${params.type}`);
      }

      const processingTime = Date.now() - startTime;

      const response: GraphDataResponse = {
        data,
        metadata: {
          requestType: params.type,
          timestamp: Date.now(),
          processingTime,
        },
      };

      this.logger.debug(
        `Graph data request completed: type=${params.type}, nodeCount=${data.nodes.length}, edgeCount=${data.edges.length}, processingTime=${processingTime}ms`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error processing graph data request: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get the symbol manager instance
   */
  private getSymbolManager(): ISymbolManager {
    // Use the singleton ApexSymbolProcessingManager as fallback
    return ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }
}
