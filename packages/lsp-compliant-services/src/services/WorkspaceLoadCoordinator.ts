/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, ProgressToken } from 'vscode-languageserver';
import { LoggerInterface, LoadWorkspaceParams, LoadWorkspaceResult } from '@salesforce/apex-lsp-shared';

/**
 * Result of workspace load operation
 */
export interface LoadResult {
  status: 'loaded' | 'failed' | 'timeout';
}

/**
 * Coordinates workspace loading across multiple concurrent LSP requests.
 * Ensures only one load operation runs at a time and allows multiple
 * requests to wait on the same load.
 */
export class WorkspaceLoadCoordinator {
  private static instance: WorkspaceLoadCoordinator | null = null;
  private loadPromise: Promise<LoadResult> | null = null;
  private loadInProgress = false;
  private readonly logger: LoggerInterface;

  private constructor(logger: LoggerInterface) {
    this.logger = logger;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(logger?: LoggerInterface): WorkspaceLoadCoordinator {
    if (!WorkspaceLoadCoordinator.instance) {
      if (!logger) {
        throw new Error('Logger required for first initialization');
      }
      WorkspaceLoadCoordinator.instance = new WorkspaceLoadCoordinator(logger);
    }
    return WorkspaceLoadCoordinator.instance;
  }

  /**
   * Ensure workspace is loaded before processing request.
   * If already loading, wait for that operation to complete.
   * If not loaded, trigger load with progress reporting.
   * 
   * Multiple concurrent calls share the same load operation.
   * Only the first caller's progress token is used for reporting.
   * 
   * @param connection Connection for server-client communication
   * @param workDoneToken Optional progress token from client
   * @returns Promise that resolves when workspace is loaded
   */
  async ensureWorkspaceLoaded(
    connection: Connection,
    workDoneToken?: ProgressToken,
  ): Promise<LoadResult> {
    // If load is already in progress, return the existing promise
    if (this.loadPromise) {
      this.logger.debug(() => 'Workspace load already in progress, waiting for completion');
      return this.loadPromise;
    }

    // Check current workspace state
    const stateResult = await this.queryWorkspaceState(connection);
    
    if ('loaded' in stateResult && stateResult.loaded) {
      this.logger.debug(() => 'Workspace already loaded');
      return { status: 'loaded' };
    }

    if ('loading' in stateResult && stateResult.loading) {
      this.logger.debug(() => 'Workspace currently loading on client, creating wait promise');
      // Client is loading, create a polling promise to wait for completion
      this.loadPromise = this.waitForClientLoad(connection);
      return this.loadPromise;
    }

    if ('failed' in stateResult && stateResult.failed) {
      this.logger.debug(() => 'Previous workspace load failed, retrying');
      // Previous load failed, allow retry
    }

    // Trigger new workspace load
    this.logger.debug(() => 'Triggering workspace load');
    this.loadInProgress = true;
    this.loadPromise = this.triggerWorkspaceLoad(connection, workDoneToken);
    
    return this.loadPromise;
  }

  /**
   * Query workspace state without triggering load
   */
  private async queryWorkspaceState(connection: Connection): Promise<LoadWorkspaceResult> {
    try {
      const result = await connection.sendRequest('apex/loadWorkspace', {
        queryOnly: true,
      } as LoadWorkspaceParams);
      
      this.logger.debug(() => `Workspace state query result: ${JSON.stringify(result)}`);
      return result as LoadWorkspaceResult;
    } catch (error) {
      this.logger.error(() => `Failed to query workspace state: ${error}`);
      return { error: `Failed to query workspace state: ${error}` };
    }
  }

  /**
   * Wait for client-side workspace load to complete
   */
  private async waitForClientLoad(connection: Connection): Promise<LoadResult> {
    const maxWaitTime = 30000; // 30 seconds
    const pollInterval = 1000; // 1 second
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const stateResult = await this.queryWorkspaceState(connection);
      
      if ('loaded' in stateResult && stateResult.loaded) {
        this.logger.debug(() => 'Client workspace load completed');
        this.clearLoadPromise();
        return { status: 'loaded' };
      }
      
      if ('failed' in stateResult && stateResult.failed) {
        this.logger.debug(() => 'Client workspace load failed');
        this.clearLoadPromise();
        return { status: 'failed' };
      }
      
      // Continue polling if still loading
    }

    this.logger.warn(() => 'Timeout waiting for client workspace load');
    this.clearLoadPromise();
    return { status: 'timeout' };
  }

  /**
   * Trigger workspace load on client
   */
  private async triggerWorkspaceLoad(
    connection: Connection,
    workDoneToken?: ProgressToken,
  ): Promise<LoadResult> {
    try {
      const result = await connection.sendRequest('apex/loadWorkspace', {
        workDoneToken,
      } as LoadWorkspaceParams) as LoadWorkspaceResult;
      
      this.logger.debug(() => `Workspace load result: ${JSON.stringify(result)}`);
      
      if ('accepted' in result && result.accepted) {
        if (result.alreadyLoaded) {
          this.logger.debug(() => 'Workspace was already loaded');
          this.clearLoadPromise();
          return { status: 'loaded' };
        }
        
        if (result.inProgress) {
          this.logger.debug(() => 'Workspace load initiated, waiting for completion');
          // Load was initiated, wait for completion
          return await this.waitForClientLoad(connection);
        }
        
        // Load was accepted, wait for completion
        return await this.waitForClientLoad(connection);
      }
      
      this.logger.error(() => `Workspace load not accepted: ${JSON.stringify(result)}`);
      this.clearLoadPromise();
      return { status: 'failed' };
    } catch (error) {
      this.logger.error(() => `Failed to trigger workspace load: ${error}`);
      this.clearLoadPromise();
      return { status: 'failed' };
    }
  }

  /**
   * Clear the current load promise
   */
  private clearLoadPromise(): void {
    this.loadPromise = null;
    this.loadInProgress = false;
  }

  /**
   * Check if workspace load is currently in progress
   */
  isLoadInProgress(): boolean {
    return this.loadInProgress;
  }

  /**
   * Reset the coordinator (useful for testing)
   */
  reset(): void {
    this.loadPromise = null;
    this.loadInProgress = false;
  }
}
