/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

/**
 * Profiling type
 */
export type ProfilingType = 'cpu' | 'heap' | 'both';

/**
 * Profiling state
 */
export type ProfilingState = 'idle' | 'cpu' | 'heap' | 'both';

/**
 * Result of starting profiling
 */
export interface StartProfilingResult {
  success: boolean;
  message: string;
  type?: ProfilingType;
}

/**
 * Result of stopping profiling
 */
export interface StopProfilingResult {
  success: boolean;
  message: string;
  files?: string[];
}

/**
 * Sanitize a tag for use in filenames
 * Removes invalid characters and limits length
 */
function sanitizeTag(tag: string): string {
  // Remove invalid filename characters: < > : " / \ | ? *
  // Replace spaces and other special chars with underscores
  // Limit length to 50 characters
  return tag
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
    .trim();
}

/**
 * Profiling status
 */
export interface ProfilingStatus {
  isProfiling: boolean;
  type: ProfilingState;
  available: boolean;
}

/**
 * Service for managing Node.js CPU and heap profiling using the inspector API
 *
 * This service dynamically loads the Node.js inspector module to avoid bundling
 * issues in browser/webworker environments. Profiling is only available in
 * Node.js (desktop) environments.
 */
export class ProfilingService {
  private static instance: ProfilingService | null = null;
  private inspector: any = null;
  private session: any = null;
  private isConnected = false;
  private currentState: ProfilingState = 'idle';
  private outputDir: string | null = null;
  private logger: LoggerInterface | null = null;
  private cpuProfileSequence = 1; // Sequence counter for CPU profiles
  private heapProfileSequence = 1; // Sequence counter for heap profiles

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ProfilingService
   */
  public static getInstance(): ProfilingService {
    if (!ProfilingService.instance) {
      ProfilingService.instance = new ProfilingService();
    }
    return ProfilingService.instance;
  }

  /**
   * Initialize the service with logger and output directory
   */
  public initialize(logger: LoggerInterface, outputDir: string): void {
    this.logger = logger;
    this.outputDir = outputDir;
  }

  /**
   * Check if the inspector API is available in the current environment
   */
  public isAvailable(): boolean {
    if (this.inspector !== null) {
      return true;
    }

    // Check if we're in a Node.js environment
    if (typeof process === 'undefined' || !process.versions?.node) {
      return false;
    }

    // Try to load inspector module
    try {
      // Use require() for dynamic loading (not at module level)
      this.inspector = require('inspector');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure inspector session is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Inspector API is not available in this environment');
    }

    if (this.isConnected && this.session) {
      return;
    }

    try {
      this.session = new this.inspector.Session();
      this.session.connect();
      this.isConnected = true;
      this.logger?.debug('Inspector session connected');
    } catch (error) {
      this.logger?.error(`Failed to connect inspector session: ${error}`);
      throw new Error(`Failed to connect inspector session: ${error}`);
    }
  }

  /**
   * Start CPU profiling
   */
  public async startCPUProfiling(): Promise<void> {
    await this.ensureConnected();

    try {
      // session.post uses a callback pattern, so we need to wrap it in a Promise
      await new Promise<void>((resolve, reject) => {
        this.session.post('Profiler.enable', (error: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        this.session.post('Profiler.start', (error: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      this.logger?.info('CPU profiling started');
    } catch (error) {
      this.logger?.error(`Failed to start CPU profiling: ${error}`);
      throw new Error(`Failed to start CPU profiling: ${error}`);
    }
  }

  /**
   * Stop CPU profiling and save to file
   * @param tag Optional tag to include in filename
   */
  public async stopCPUProfiling(tag?: string): Promise<string> {
    if (!this.isConnected || !this.session) {
      throw new Error('Inspector session not connected');
    }

    try {
      // session.post uses a callback pattern, so we need to wrap it in a Promise
      const result = await new Promise<any>((resolve, reject) => {
        this.session.post('Profiler.stop', (error: any, params: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(params);
        });
      });

      // Check if result has profile property
      if (!result || !result.profile) {
        throw new Error('Profiler.stop did not return profile data');
      }

      const profile = result.profile;

      // Generate filename matching Node.js default format: CPU.PID.YYYYMMDD.HHMMSS.mmm.sequence.cpuprofile
      const now = new Date();
      const pid = process.pid;
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      const timestamp = `${year}${month}${day}.${hours}${minutes}${seconds}.${milliseconds}`;
      const tagSuffix = tag ? `.${sanitizeTag(tag)}` : '';
      const sequence = String(this.cpuProfileSequence++).padStart(3, '0');
      const filename = `CPU.${pid}.${timestamp}${tagSuffix}.0.${sequence}.cpuprofile`;
      const filepath = path.join(this.outputDir || process.cwd(), filename);

      // Write profile to file
      fs.writeFileSync(filepath, JSON.stringify(profile, null, 2));
      this.logger?.info(`CPU profile saved to: ${filepath}`);

      return filepath;
    } catch (error) {
      this.logger?.error(`Failed to stop CPU profiling: ${error}`);
      throw new Error(`Failed to stop CPU profiling: ${error}`);
    }
  }

  /**
   * Start heap profiling
   */
  public async startHeapProfiling(): Promise<void> {
    await this.ensureConnected();

    try {
      // session.post uses a callback pattern, so we need to wrap it in a Promise
      await new Promise<void>((resolve, reject) => {
        this.session.post('HeapProfiler.enable', (error: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        this.session.post('HeapProfiler.startSampling', (error: any) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      this.logger?.info('Heap profiling started');
    } catch (error) {
      this.logger?.error(`Failed to start heap profiling: ${error}`);
      throw new Error(`Failed to start heap profiling: ${error}`);
    }
  }

  /**
   * Stop heap profiling and save snapshot
   * @param tag Optional tag to include in filename
   */
  public async stopHeapProfiling(tag?: string): Promise<string> {
    if (!this.isConnected || !this.session) {
      throw new Error('Inspector session not connected');
    }

    try {
      // Generate filename matching Node.js default format: Heap.PID.YYYYMMDD.HHMMSS.mmm.sequence.heapsnapshot
      const now = new Date();
      const pid = process.pid;
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
      const timestamp = `${year}${month}${day}.${hours}${minutes}${seconds}.${milliseconds}`;
      const tagSuffix = tag ? `.${sanitizeTag(tag)}` : '';
      const sequence = String(this.heapProfileSequence++).padStart(3, '0');
      const filename = `Heap.${pid}.${timestamp}${tagSuffix}.0.${sequence}.heapsnapshot`;
      const filepath = path.join(this.outputDir || process.cwd(), filename);

      // Create write stream for snapshot
      const writeStream = fs.createWriteStream(filepath);

      // Take heap snapshot - the data is streamed via chunks
      await new Promise<void>((resolve, reject) => {
        let chunkCount = 0;
        let isComplete = false;
        let timeoutHandle: NodeJS.Timeout | null = null;

        // Cleanup function
        const cleanup = () => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
          }
          this.session.removeListener(
            'HeapProfiler.addHeapSnapshotChunk',
            chunkHandler,
          );
        };

        // Listen for chunk events
        const chunkHandler = (chunk: { chunk: string }) => {
          chunkCount++;
          writeStream.write(chunk.chunk);
        };

        const endHandler = () => {
          isComplete = true;
          writeStream.end();
          cleanup();
          resolve();
        };

        this.session.on('HeapProfiler.addHeapSnapshotChunk', chunkHandler);

        // Take the snapshot
        this.session.post('HeapProfiler.takeHeapSnapshot', (error: any) => {
          if (error) {
            cleanup();
            writeStream.destroy();
            reject(error);
            return;
          }
          // The snapshot will be streamed via chunks, and we'll get a completion event
          // For now, we'll wait a reasonable time for chunks to arrive
          // In practice, the chunks come quickly, so we use a timeout as a fallback
          timeoutHandle = setTimeout(() => {
            if (!isComplete) {
              // If we haven't received completion, assume we're done after a delay
              // This is a fallback - in practice chunks arrive quickly
              isComplete = true;
              writeStream.end();
              cleanup();
              resolve();
            }
          }, 5000); // 5 second timeout as fallback

          // Use unref() to prevent the timeout from keeping the process alive
          if (timeoutHandle) {
            timeoutHandle.unref();
          }
        });
      });

      this.logger?.info(`Heap snapshot saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      this.logger?.error(`Failed to stop heap profiling: ${error}`);
      throw new Error(`Failed to stop heap profiling: ${error}`);
    }
  }

  /**
   * Start profiling based on type
   */
  public async startProfiling(
    type: ProfilingType,
  ): Promise<StartProfilingResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        message:
          'Profiling is not available in this environment (Node.js required)',
      };
    }

    if (this.currentState !== 'idle') {
      return {
        success: false,
        message: `Profiling is already active (${this.currentState})`,
      };
    }

    try {
      const files: string[] = [];

      if (type === 'cpu' || type === 'both') {
        await this.startCPUProfiling();
        this.currentState = type === 'cpu' ? 'cpu' : 'both';
      }

      if (type === 'heap' || type === 'both') {
        await this.startHeapProfiling();
        this.currentState = type === 'heap' ? 'heap' : 'both';
      }

      return {
        success: true,
        message: `Profiling started: ${type}`,
        type,
      };
    } catch (error) {
      this.logger?.error(`Failed to start profiling: ${error}`);
      return {
        success: false,
        message: `Failed to start profiling: ${error}`,
      };
    }
  }

  /**
   * Stop profiling and save files
   * @param tag Optional tag to include in filenames
   */
  public async stopProfiling(tag?: string): Promise<StopProfilingResult> {
    if (this.currentState === 'idle') {
      return {
        success: false,
        message: 'No profiling is currently active',
      };
    }

    try {
      const files: string[] = [];

      if (this.currentState === 'cpu' || this.currentState === 'both') {
        const cpuFile = await this.stopCPUProfiling(tag);
        files.push(cpuFile);
      }

      if (this.currentState === 'heap' || this.currentState === 'both') {
        const heapFile = await this.stopHeapProfiling(tag);
        files.push(heapFile);
      }

      const previousState = this.currentState;
      this.currentState = 'idle';

      return {
        success: true,
        message: `Profiling stopped: ${previousState}`,
        files,
      };
    } catch (error) {
      this.logger?.error(`Failed to stop profiling: ${error}`);
      return {
        success: false,
        message: `Failed to stop profiling: ${error}`,
      };
    }
  }

  /**
   * Get current profiling status
   */
  public getStatus(): ProfilingStatus {
    return {
      isProfiling: this.currentState !== 'idle',
      type: this.currentState,
      available: this.isAvailable(),
    };
  }

  /**
   * Check if profiling is currently active
   */
  public isProfiling(): boolean {
    return this.currentState !== 'idle';
  }

  /**
   * Get current profiling type
   */
  public getProfilingType(): ProfilingState {
    return this.currentState;
  }

  /**
   * Disconnect inspector session and clean up resources
   * This should be called when the service is no longer needed (e.g., during test teardown)
   */
  public dispose(): void {
    if (this.session && this.isConnected) {
      try {
        this.session.disconnect();
        this.logger?.debug('Inspector session disconnected');
      } catch (error) {
        this.logger?.warn(`Error disconnecting inspector session: ${error}`);
      }
      this.session = null;
      this.isConnected = false;
    }
    this.currentState = 'idle';
  }
}
