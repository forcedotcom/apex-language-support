/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type { EnvironmentType } from '@salesforce/apex-lsp-shared';
import { detectEnvironment } from '../utils/Environment';

/**
 * Unified connection configuration supporting all environments
 */
export interface ConnectionConfig {
  logger?: Logger;
  // Node.js specific options
  mode?: 'stdio' | 'socket' | 'ipc';
  port?: number;
  host?: string;
  // Browser specific options
  worker?: Worker;
  // Override automatic environment detection
  environment?: EnvironmentType;
}

/**
 * Interface for environment-specific connection factories
 */
export interface IConnectionFactory {
  /**
   * Creates a connection for the specific environment
   */
  createConnection(config?: ConnectionConfig): Promise<MessageConnection>;

  /**
   * Indicates if this factory supports the given environment
   */
  supports(environment: EnvironmentType): boolean;
}

/**
 * Registry for managing environment-specific connection factories
 */
export class ConnectionFactoryRegistry {
  private static instance: ConnectionFactoryRegistry;
  private readonly factories = new Map<EnvironmentType, IConnectionFactory>();

  private constructor() {}

  /**
   * Gets the singleton registry instance
   */
  static getInstance(): ConnectionFactoryRegistry {
    if (!ConnectionFactoryRegistry.instance) {
      ConnectionFactoryRegistry.instance = new ConnectionFactoryRegistry();
    }
    return ConnectionFactoryRegistry.instance;
  }

  /**
   * Registers a connection factory for a specific environment
   */
  register(environment: EnvironmentType, factory: IConnectionFactory): void {
    if (!factory.supports(environment)) {
      throw new Error(`Factory does not support environment: ${environment}`);
    }
    this.factories.set(environment, factory);
  }

  /**
   * Creates a connection for the specified or detected environment
   */
  async createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    const environment = config?.environment ?? detectEnvironment();
    const factory = this.factories.get(environment);

    if (!factory) {
      const supportedEnvs = Array.from(this.factories.keys()).join(', ');
      throw new Error(
        `No factory registered for environment: ${environment}. ` +
          `Supported environments: ${supportedEnvs}`,
      );
    }

    try {
      return await factory.createConnection(config);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Connection creation failed for ${environment}: ${errorMessage}`,
      );
    }
  }

  /**
   * Gets all registered environments
   */
  getSupportedEnvironments(): EnvironmentType[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Checks if an environment is supported
   */
  isSupported(environment: EnvironmentType): boolean {
    return this.factories.has(environment);
  }
}

/**
 * Abstract base class for connection factories with common functionality
 */
export abstract class BaseConnectionFactory implements IConnectionFactory {
  abstract supports(environment: EnvironmentType): boolean;
  abstract createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection>;

  /**
   * Validates connection configuration
   */
  protected validateConfig(config?: ConnectionConfig): void {
    // Common validation logic can be added here
    if (config?.environment && !this.supports(config.environment)) {
      throw new Error(
        `Factory does not support environment: ${config.environment}`,
      );
    }
  }

  /**
   * Handles connection creation errors with context
   */
  protected handleError(error: Error, context: string): never {
    throw new Error(`${context}: ${error.message}`);
  }
}

// Singleton instance for easy access
export const connectionFactory = ConnectionFactoryRegistry.getInstance();
