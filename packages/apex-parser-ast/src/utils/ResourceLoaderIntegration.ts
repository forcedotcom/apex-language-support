/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ResourceLoader } from './resourceLoader';
import { NamespaceResolver } from './NamespaceResolver';
import { ApexSymbolManager } from '../symbols/ApexSymbolManager';
import { SymbolManagerFactory } from '../symbols/SymbolManagerFactory';

import {
  CompilationContext,
  ReferenceTypeValue,
  IdentifierContextValue,
  NamespaceResolutionResult,
} from '../types/namespaceResolution';
import { ApexSymbol, SymbolKind, SymbolVisibility } from '../types/symbol';

/**
 * Integration utility for using ResourceLoader with namespace resolution
 * Provides a complete solution for loading standard Apex classes and resolving symbols
 */
export class ResourceLoaderIntegration {
  private static readonly logger = getLogger();
  private resourceLoader: ResourceLoader;
  private symbolManager: ApexSymbolManager;
  private readonly logger = getLogger();

  constructor(options?: {
    loadMode?: 'lazy' | 'full';
    symbolManager?: ApexSymbolManager;
  }) {
    // Create or use existing symbol manager
    this.symbolManager = (options?.symbolManager ||
      SymbolManagerFactory.createSymbolManager()) as ApexSymbolManager;

    // Create resource loader with symbol manager integration
    this.resourceLoader = ResourceLoader.getInstance({
      loadMode: options?.loadMode || 'full',
      symbolManager: this.symbolManager,
    });
  }

  /**
   * Initialize the resource loader and wait for compilation
   */
  async initialize(): Promise<void> {
    this.logger.debug(() => 'Initializing ResourceLoaderIntegration...');

    await this.resourceLoader.initialize();

    if (this.resourceLoader.isCompiling()) {
      this.logger.debug(() => 'Waiting for compilation to complete...');
      await this.resourceLoader.waitForCompilation();
    }

    this.logger.debug(
      () => 'ResourceLoaderIntegration initialization complete',
    );

    // Log statistics
    const stats = this.resourceLoader.getStatistics();
    this.logger.debug(
      () => `ResourceLoader Statistics: ${JSON.stringify(stats, null, 2)}`,
    );
  }

  /**
   * Resolve a symbol using the Java compiler's namespace resolution system
   * @param name The symbol name to resolve (e.g., "String", "System.debug", "MyNamespace.MyClass")
   * @param context The compilation context
   * @param referenceType The type of reference (LOAD, STORE, METHOD, CLASS, NONE)
   * @param identifierContext The identifier context (STATIC, OBJECT, NONE)
   * @returns The resolution result
   */
  resolveSymbol(
    name: string,
    context: CompilationContext,
    referenceType: ReferenceTypeValue = 'NONE',
    identifierContext: IdentifierContextValue = 'NONE',
  ): NamespaceResolutionResult {
    const nameParts = name.split('.');

    return NamespaceResolver.resolveTypeName(
      nameParts,
      context,
      referenceType,
      identifierContext,
      this.symbolManager,
    );
  }

  /**
   * Resolve a symbol with simplified context
   * @param name The symbol name to resolve
   * @param sourceFile The source file path
   * @param namespace The namespace context
   * @param referenceType The type of reference
   * @returns The resolution result
   */
  resolveSymbolSimple(
    name: string,
    sourceFile: string,
    namespace?: string,
    referenceType: ReferenceTypeValue = 'NONE',
  ): NamespaceResolutionResult {
    // Create a simple compilation context
    const context: CompilationContext = {
      namespace: namespace
        ? {
            name: namespace,
            bytecodeName: namespace,
            bytecodeNameLower: namespace.toLowerCase(),
            isNull: false,
            isEmpty: false,
          }
        : null,
      version: 58, // Default Apex version
      isTrusted: true,
      sourceType: 'FILE',
      referencingType: this.createDummySymbol(sourceFile),
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: false,
    };

    return this.resolveSymbol(name, context, referenceType);
  }

  /**
   * Find a symbol by name using the symbol manager
   * @param name The symbol name
   * @returns Array of matching symbols
   */
  findSymbolByName(name: string): ApexSymbol[] {
    return this.symbolManager.findSymbolByName(name);
  }

  /**
   * Find a symbol by fully qualified name
   * @param fqn The fully qualified name
   * @returns The symbol or null if not found
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null {
    return this.symbolManager.findSymbolByFQN(fqn);
  }

  /**
   * Get all available symbols
   * @returns Array of all symbols
   */
  getAllSymbols(): ApexSymbol[] {
    return this.symbolManager.getAllSymbolsForCompletion();
  }

  /**
   * Get statistics about the loaded resources and symbols
   * @returns Statistics object
   */
  getStatistics(): {
    resourceLoader: any;
    symbolManager: any;
    totalSymbols: number;
  } {
    return {
      resourceLoader: this.resourceLoader.getStatistics(),
      symbolManager: this.symbolManager.getStats(),
      totalSymbols: this.symbolManager.getAllSymbolsForCompletion().length,
    };
  }

  /**
   * Check if a symbol is a built-in Apex type
   * @param name The symbol name
   * @returns true if it's a built-in type
   */
  isBuiltInType(name: string): boolean {
    const builtInSymbol = this.symbolManager.findBuiltInType(name);
    return builtInSymbol !== null;
  }

  /**
   * Check if a symbol is a standard Apex class
   * @param name The symbol name
   * @returns true if it's a standard Apex class
   */
  isStandardApexClass(name: string): boolean {
    const symbols = this.findSymbolByName(name);
    return symbols.some(
      (s) => s.kind === 'class' && s.namespace === 'BUILT_IN',
    );
  }

  /**
   * Get the underlying resource loader
   * @returns The ResourceLoader instance
   */
  getResourceLoader(): ResourceLoader {
    return this.resourceLoader;
  }

  /**
   * Get the underlying symbol manager
   * @returns The ApexSymbolManager instance
   */
  getSymbolManager(): ApexSymbolManager {
    return this.symbolManager;
  }

  /**
   * Create a dummy symbol for compilation context
   * @private
   */
  private createDummySymbol(sourceFile: string): ApexSymbol {
    return {
      id: 'dummy-symbol',
      name: 'DummyClass',
      kind: SymbolKind.Class,
      namespace: undefined,
      modifiers: {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      location: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 0,
      },
      filePath: sourceFile,
      parentId: null,
      key: {
        prefix: SymbolKind.Class,
        name: 'DummyClass',
        path: [sourceFile, 'DummyClass'],
        kind: SymbolKind.Class,
        unifiedId: 'dummy-symbol',
        filePath: sourceFile,
      },
      parentKey: null,
      _modifierFlags: 0,
      _isLoaded: true,
      parent: null,
      fqn: 'DummyClass',
    };
  }
}

/**
 * Convenience function to create and initialize a ResourceLoaderIntegration
 * @param options Configuration options
 * @returns Initialized ResourceLoaderIntegration instance
 */
export async function createResourceLoaderIntegration(options?: {
  loadMode?: 'lazy' | 'full';
  symbolManager?: ApexSymbolManager;
}): Promise<ResourceLoaderIntegration> {
  const integration = new ResourceLoaderIntegration(options);
  await integration.initialize();
  return integration;
}

/**
 * Example usage of the ResourceLoaderIntegration
 */
export async function exampleUsage(): Promise<void> {
  const logger = getLogger();

  try {
    // Create and initialize the integration
    const integration = await createResourceLoaderIntegration({
      loadMode: 'full',
    });

    // Get statistics
    const stats = integration.getStatistics();
    logger.debug(() => `Loaded ${stats.totalSymbols} symbols`);

    // Resolve some symbols using the Java compiler's namespace resolution
    const stringResult = integration.resolveSymbolSimple(
      'String',
      'test.cls',
      undefined,
      'NONE',
    );
    logger.debug(
      () =>
        `String resolution: ${stringResult.isResolved ? 'SUCCESS' : 'FAILED'}`,
    );

    const systemResult = integration.resolveSymbolSimple(
      'System',
      'test.cls',
      undefined,
      'NONE',
    );
    logger.debug(
      () =>
        `System resolution: ${systemResult.isResolved ? 'SUCCESS' : 'FAILED'}`,
    );

    const systemDebugResult = integration.resolveSymbolSimple(
      'System.debug',
      'test.cls',
      undefined,
      'METHOD',
    );
    logger.debug(
      () =>
        `System.debug resolution: ${systemDebugResult.isResolved ? 'SUCCESS' : 'FAILED'}`,
    );

    // Check if types are built-in
    logger.debug(
      () => `String is built-in: ${integration.isBuiltInType('String')}`,
    );
    logger.debug(
      () =>
        `System is standard class: ${integration.isStandardApexClass('System')}`,
    );
  } catch (error) {
    logger.error(() => `Error in example usage: ${error}`);
  }
}
