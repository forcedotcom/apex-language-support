/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ICompilerService } from './ICompilerService';
import { WebStubCompilerService } from './webStubParser';

/**
 * Factory for creating compiler service instances based on environment.
 * Provides either the full CompilerService or a web-compatible stub.
 */
export class CompilerServiceFactory {
  private static logger = getLogger();

  /**
   * Creates a compiler service instance appropriate for the current environment.
   * In web/worker environments where @apexdevtools/apex-parser is not available,
   * returns a stub implementation. Otherwise returns the full CompilerService.
   * 
   * @param projectNamespace Optional namespace for the current project
   * @param forceStub Force use of stub implementation for testing
   * @returns A compiler service instance
   */
  public static createCompilerService(
    projectNamespace?: string,
    forceStub: boolean = false,
  ): ICompilerService {
    // Check if we should use the stub implementation
    if (forceStub || this.shouldUseStub()) {
      this.logger.info('🌐 Using web-compatible stub compiler service');
      return new WebStubCompilerService(projectNamespace);
    }

    try {
      // Try to dynamically import the full CompilerService
      // This import will fail in environments where @apexdevtools/apex-parser is not available
      // Use dynamic require to prevent bundlers from including the module
      const modulePath = './compilerService';
      const compilerServiceModule = (global as any).require ? (global as any).require(modulePath) : require(modulePath);
      const { CompilerService } = compilerServiceModule;
      this.logger.debug('⚙️ Using full CompilerService with apex-parser');
      return new CompilerService(projectNamespace);
    } catch (error) {
      this.logger.warn(
        `🚫 Full CompilerService not available (${error instanceof Error ? error.message : String(error)}), falling back to stub`,
      );
      return new WebStubCompilerService(projectNamespace);
    }
  }

  /**
   * Determines if the stub implementation should be used based on environment.
   * Currently checks for web worker environment and availability of importScripts.
   */
  private static shouldUseStub(): boolean {
    // Check if we're in a web worker environment
    if (typeof self !== 'undefined' && typeof window === 'undefined') {
      return true;
    }

    // Check if we're in a browser environment without Node.js modules
    if (typeof window !== 'undefined' && typeof process === 'undefined') {
      return true;
    }

    // Check if apex-parser dependencies are available
    try {
      require('@apexdevtools/apex-parser');
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Check if the full compiler service is available in the current environment
   */
  public static isFullCompilerServiceAvailable(): boolean {
    return !this.shouldUseStub();
  }
}