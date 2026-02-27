/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  ApexSymbolProcessingManager,
  GraphData,
  FileGraphData,
  TypeGraphData,
} from '@salesforce/apex-lsp-parser-ast';
import type { Diagnostic } from 'vscode-languageserver';
import type { DiagnosticGraphCorrelation } from '../types/diagnosticGraph';
import { DiagnosticProcessingService } from './DiagnosticProcessingService';
import { DiagnosticGraphCorrelationService } from './DiagnosticGraphCorrelationService';

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
  /** Include diagnostics and correlations (requires fileUri for file-specific diagnostics) */
  includeDiagnostics?: boolean;
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
  /** Diagnostics when includeDiagnostics is true */
  diagnostics?: Diagnostic[];
  /** Diagnostic-graph correlations when includeDiagnostics is true */
  diagnosticCorrelations?: DiagnosticGraphCorrelation[];
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
  private readonly correlationService: DiagnosticGraphCorrelationService;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager = symbolManager || this.getSymbolManager();
    this.correlationService = new DiagnosticGraphCorrelationService();
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

      // Include diagnostics and correlations when requested
      if (params.includeDiagnostics && params.fileUri) {
        try {
          const diagnosticService = new DiagnosticProcessingService(
            this.logger,
            this.symbolManager,
          );
          const diagnostics = await diagnosticService.processDiagnostic({
            textDocument: { uri: params.fileUri },
          });
          const correlations =
            this.correlationService.correlateDiagnosticsWithGraph(
              diagnostics,
              data,
              params.fileUri,
            );
          response.diagnostics = diagnostics;
          response.diagnosticCorrelations = correlations;
          this.logger.debug(
            `Included ${diagnostics.length} diagnostics and ${correlations.length} correlations`,
          );
        } catch (diagError) {
          this.logger.warn(
            `Failed to include diagnostics: ${diagError instanceof Error ? diagError.message : String(diagError)}`,
          );
        }
      } else if (params.includeDiagnostics && params.type === 'all') {
        // For 'all' type, use first file from graph if fileUri not provided
        const firstFile = data.nodes[0]?.fileUri;
        if (firstFile) {
          try {
            const diagnosticService = new DiagnosticProcessingService(
              this.logger,
              this.symbolManager,
            );
            const diagnostics = await diagnosticService.processDiagnostic({
              textDocument: { uri: firstFile },
            });
            const correlations =
              this.correlationService.correlateDiagnosticsWithGraph(
                diagnostics,
                data,
                firstFile,
              );
            response.diagnostics = diagnostics;
            response.diagnosticCorrelations = correlations;
          } catch (diagError) {
            this.logger.warn(
              `Failed to include diagnostics: ${diagError instanceof Error ? diagError.message : String(diagError)}`,
            );
          }
        }
      }

      this.logger.debug(
        `Graph data request completed: type=${params.type}, nodeCount=${data.nodes.length}, ` +
          `edgeCount=${data.edges.length}, processingTime=${processingTime}ms`,
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
