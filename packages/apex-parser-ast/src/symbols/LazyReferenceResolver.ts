/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
  SymbolFactory,
} from '../types/symbol';
import { ReferenceContext } from '../types/typeReference';
import { BuiltInTypeTablesImpl } from '../utils/BuiltInTypeTables';

/**
 * Context for lazy binding of cross-file references
 */
interface LazyBindingContext {
  sourceFile: string;
  targetFile?: string;
  expectedNamespace?: string;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
  isStatic: boolean;
  resolutionAttempts: number;
  lastAttempt: number;
  resolutionErrors: string[];
}

/**
 * Task for lazy resolution queue
 */
interface LazyResolutionTask {
  referenceVertex: ReferenceVertex;
  priority: number;
  timestamp: number;
  context: LazyBindingContext;
}

/**
 * Enhanced ReferenceVertex with lazy binding support
 */
interface ReferenceVertex {
  // Core reference data
  id: string;
  name: string;
  context: ReferenceContext;
  qualifier?: string;
  parentContext?: string;

  // Lazy binding state
  isResolved: boolean;
  resolvedSymbolId?: string;
  bindingContext: LazyBindingContext;

  // Cross-file resolution metadata
  expectedTargetFile?: string;
  expectedNamespace?: string;
  accessModifier?: 'public' | 'private' | 'protected' | 'global';

  // Resolution attempts tracking
  resolutionAttempts: number;
  lastResolutionAttempt: number;
  resolutionErrors: string[];
}

/**
 * Lazy Reference Resolver for cross-file symbol resolution
 *
 * This class handles the lazy binding of cross-file references that cannot be
 * resolved immediately during symbol addition. It implements a priority-based
 * resolution queue and sophisticated access constraint validation.
 */
export class LazyReferenceResolver {
  private readonly logger = getLogger();
  private readonly builtInTypeTables: BuiltInTypeTablesImpl;
  private readonly lazyResolutionQueue: LazyResolutionTask[] = [];
  private readonly maxQueueSize = 1000;
  private readonly maxResolutionAttempts = 3;
  private readonly resolutionTimeout = 5000; // 5 seconds
  private readonly processedReferences = new Set<string>();

  constructor(builtInTypeTables: BuiltInTypeTablesImpl) {
    this.builtInTypeTables = builtInTypeTables;
  }

  /**
   * Attempt to resolve a reference immediately or queue for lazy resolution
   * @param referenceVertex The reference vertex to resolve
   * @param symbolLookup Function to find symbols by name
   * @param fileLookup Function to find symbols in a specific file
   * @returns The resolved symbol or null if queued for lazy resolution
   */
  resolveReference(
    referenceVertex: ReferenceVertex,
    symbolLookup: (name: string) => ApexSymbol[],
    fileLookup: (filePath: string) => ApexSymbol[],
  ): ApexSymbol | null {
    // Check if already resolved
    if (referenceVertex.isResolved && referenceVertex.resolvedSymbolId) {
      const symbol = this.getSymbolById(
        referenceVertex.resolvedSymbolId,
        symbolLookup,
      );
      if (symbol) {
        return symbol;
      }
    }

    // Check if already processed
    if (this.processedReferences.has(referenceVertex.id)) {
      return null;
    }

    // Step 1: Attempt immediate resolution
    const immediateResult = this.attemptImmediateResolution(
      referenceVertex,
      symbolLookup,
      fileLookup,
    );
    if (immediateResult) {
      this.markResolved(referenceVertex, immediateResult);
      return immediateResult;
    }

    // Step 2: Queue for lazy resolution
    this.queueForLazyResolution(referenceVertex);
    return null;
  }

  /**
   * Process the lazy resolution queue
   * @param symbolLookup Function to find symbols by name
   * @param fileLookup Function to find symbols in a specific file
   * @param shouldProcessMore Function to determine if more processing should continue
   */
  processQueue(
    symbolLookup: (name: string) => ApexSymbol[],
    fileLookup: (filePath: string) => ApexSymbol[],
    shouldProcessMore: () => boolean = () =>
      this.lazyResolutionQueue.length > 0,
  ): void {
    this.logger.debug(
      () =>
        `Processing lazy resolution queue with ${this.lazyResolutionQueue.length} items`,
    );

    while (this.lazyResolutionQueue.length > 0 && shouldProcessMore()) {
      const task = this.dequeueHighestPriorityTask();
      if (!task) break;

      this.attemptResolution(task, symbolLookup, fileLookup);
    }
  }

  /**
   * Get statistics about the lazy resolution system
   */
  getStats(): {
    queueSize: number;
    processedCount: number;
    successRate: number;
    averageResolutionTime: number;
    failedReferences: string[];
  } {
    const totalProcessed = this.processedReferences.size;
    const successful = Array.from(this.processedReferences).filter(
      (id) =>
        // This is a simplified success check - in a real implementation,
        // we'd track success/failure more precisely
        true,
    ).length;

    return {
      queueSize: this.lazyResolutionQueue.length,
      processedCount: totalProcessed,
      successRate: totalProcessed > 0 ? (successful / totalProcessed) * 100 : 0,
      averageResolutionTime: 0, // Would track actual timing in real implementation
      failedReferences: [], // Would track failed references in real implementation
    };
  }

  /**
   * Clear the resolution queue and processed references
   */
  clear(): void {
    this.lazyResolutionQueue.length = 0;
    this.processedReferences.clear();
    this.logger.debug(() => 'Lazy resolution queue cleared');
  }

  /**
   * Attempt immediate resolution of a reference
   */
  private attemptImmediateResolution(
    referenceVertex: ReferenceVertex,
    symbolLookup: (name: string) => ApexSymbol[],
    fileLookup: (filePath: string) => ApexSymbol[],
  ): ApexSymbol | null {
    try {
      // Step 1: Try built-in type resolution
      const builtInSymbol = this.resolveBuiltInType(referenceVertex.name);
      if (builtInSymbol) {
        this.logger.debug(
          () => `Resolved built-in type: ${referenceVertex.name}`,
        );
        return builtInSymbol;
      }

      // Step 2: Try qualified reference resolution
      if (referenceVertex.qualifier) {
        const qualifiedSymbol = this.resolveQualifiedReference(
          referenceVertex,
          symbolLookup,
          fileLookup,
        );
        if (qualifiedSymbol) {
          this.logger.debug(
            () =>
              `Resolved qualified reference: ${referenceVertex.qualifier}.${referenceVertex.name}`,
          );
          return qualifiedSymbol;
        }
      }

      // Step 3: Try simple name resolution with access constraints
      const candidates = symbolLookup(referenceVertex.name);
      const validCandidates = this.filterByAccessConstraints(
        candidates,
        referenceVertex.bindingContext,
      );

      if (validCandidates.length === 1) {
        this.logger.debug(
          () => `Resolved unqualified reference: ${referenceVertex.name}`,
        );
        return validCandidates[0];
      }

      // Step 4: Try namespace-based resolution
      if (referenceVertex.expectedNamespace) {
        const namespaceCandidates = candidates.filter(
          (symbol) => symbol.namespace === referenceVertex.expectedNamespace,
        );
        if (namespaceCandidates.length === 1) {
          this.logger.debug(
            () =>
              `Resolved namespace reference: ${referenceVertex.expectedNamespace}.${referenceVertex.name}`,
          );
          return namespaceCandidates[0];
        }
      }

      return null; // Cannot resolve immediately
    } catch (error) {
      this.logger.debug(() => `Error in immediate resolution: ${error}`);
      return null;
    }
  }

  /**
   * Resolve a built-in type (System, String, Integer, etc.)
   */
  private resolveBuiltInType(name: string): ApexSymbol | null {
    try {
      const isBuiltIn = this.builtInTypeTables.isBuiltInType(name);
      if (isBuiltIn) {
        return SymbolFactory.createFullSymbol(
          name,
          SymbolKind.Class,
          {
            symbolRange: {
              startLine: 0,
              startColumn: 0,
              endLine: 0,
              endColumn: 0,
            },
            identifierRange: {
              startLine: 0,
              startColumn: 0,
              endLine: 0,
              endColumn: 0,
            },
          },
          'builtin',
          {
            visibility: SymbolVisibility.Public,
            isStatic: true,
            isFinal: false,
            isAbstract: false,
            isVirtual: false,
            isOverride: false,
            isTransient: false,
            isTestMethod: false,
            isWebService: false,
            isBuiltIn: true,
          },
          null,
          undefined,
          name,
          'system',
        );
      }
      return null;
    } catch (error) {
      this.logger.debug(
        () => `Error resolving built-in type ${name}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Resolve a qualified reference (e.g., "FileUtilities.createFile")
   */
  private resolveQualifiedReference(
    referenceVertex: ReferenceVertex,
    symbolLookup: (name: string) => ApexSymbol[],
    fileLookup: (filePath: string) => ApexSymbol[],
  ): ApexSymbol | null {
    try {
      // First, find the qualifier symbol
      const qualifierCandidates = symbolLookup(referenceVertex.qualifier!);
      if (qualifierCandidates.length === 0) {
        return null;
      }

      // Find the most appropriate qualifier (prefer same file, then accessible)
      const qualifier = this.selectBestQualifier(
        qualifierCandidates,
        referenceVertex.bindingContext.sourceFile,
      );
      if (!qualifier) {
        return null;
      }

      // Now look for the member within the qualifier's file
      const memberCandidates = fileLookup(qualifier.filePath).filter(
        (symbol) =>
          symbol.name === referenceVertex.name &&
          symbol.parentId === qualifier.id,
      );

      if (memberCandidates.length === 1) {
        return memberCandidates[0];
      }

      // If not found in the same file, try global search
      const globalCandidates = symbolLookup(referenceVertex.name).filter(
        (symbol) => symbol.parentId === qualifier.id,
      );

      if (globalCandidates.length === 1) {
        return globalCandidates[0];
      }

      return null;
    } catch (error) {
      this.logger.debug(() => `Error resolving qualified reference: ${error}`);
      return null;
    }
  }

  /**
   * Filter candidates by access constraints
   */
  private filterByAccessConstraints(
    candidates: ApexSymbol[],
    context: LazyBindingContext,
  ): ApexSymbol[] {
    return candidates.filter((symbol) => {
      // Built-in types are always accessible
      if (symbol.modifiers?.isBuiltIn) return true;

      // Check if symbol is accessible from source file
      return this.validateCrossFileAccess(
        context.sourceFile,
        symbol,
        context.accessModifier,
      );
    });
  }

  /**
   * Validate cross-file access based on access modifiers and namespaces
   */
  private validateCrossFileAccess(
    sourceFile: string,
    targetSymbol: ApexSymbol,
    accessModifier: string,
  ): boolean {
    try {
      // Built-in types are always accessible
      if (targetSymbol.modifiers?.isBuiltIn) return true;

      // Same file access
      if (targetSymbol.filePath === sourceFile) return true;

      // Global access
      if (targetSymbol.modifiers && targetSymbol.modifiers.isStatic) {
        // Global flag
        return true;
      }

      // Public access within same package/namespace
      if (
        targetSymbol.modifiers &&
        targetSymbol.modifiers.visibility === 'public'
      ) {
        // Public flag
        // Check if same namespace
        const sourceNamespace = this.extractNamespaceFromPath(sourceFile);
        const targetNamespace =
          targetSymbol.namespace ||
          this.extractNamespaceFromPath(targetSymbol.filePath);

        if (sourceNamespace === targetNamespace) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.debug(() => `Error validating cross-file access: ${error}`);
      return false;
    }
  }

  /**
   * Extract namespace from file path
   */
  private extractNamespaceFromPath(filePath: string): string {
    // Simple namespace extraction - in a real implementation,
    // this would be more sophisticated based on the project structure
    const parts = filePath.split('/');
    const forceAppIndex = parts.findIndex((part) => part === 'force-app');
    if (forceAppIndex !== -1 && parts[forceAppIndex + 1] === 'main') {
      return parts[forceAppIndex + 2] || 'default';
    }
    return 'default';
  }

  /**
   * Select the best qualifier from candidates
   */
  private selectBestQualifier(
    candidates: ApexSymbol[],
    sourceFile: string,
  ): ApexSymbol | null {
    // Prefer same file
    const sameFile = candidates.find(
      (symbol) => symbol.filePath === sourceFile,
    );
    if (sameFile) return sameFile;

    // Prefer accessible symbols
    const accessible = candidates.filter((symbol) =>
      this.validateCrossFileAccess(sourceFile, symbol, 'public'),
    );
    if (accessible.length === 1) return accessible[0];
    if (accessible.length > 1) return accessible[0]; // Return first accessible

    // Fallback to first candidate
    return candidates[0] || null;
  }

  /**
   * Queue a reference for lazy resolution
   */
  private queueForLazyResolution(referenceVertex: ReferenceVertex): void {
    if (this.lazyResolutionQueue.length >= this.maxQueueSize) {
      this.logger.debug(
        () => 'Lazy resolution queue is full, dropping oldest task',
      );
      this.lazyResolutionQueue.shift(); // Remove oldest task
    }

    const priority = this.calculateResolutionPriority(referenceVertex);
    const task: LazyResolutionTask = {
      referenceVertex,
      priority,
      timestamp: Date.now(),
      context: referenceVertex.bindingContext,
    };

    this.lazyResolutionQueue.push(task);
    this.logger.debug(
      () =>
        `Queued reference for lazy resolution: ${referenceVertex.name} (priority: ${priority})`,
    );
  }

  /**
   * Calculate resolution priority for a reference
   */
  private calculateResolutionPriority(
    referenceVertex: ReferenceVertex,
  ): number {
    let priority = 100; // Base priority

    // Higher priority for frequently accessed references
    if (referenceVertex.context === ReferenceContext.METHOD_CALL) {
      priority += 50;
    }

    // Higher priority for same-namespace references
    if (referenceVertex.expectedNamespace) {
      priority += 25;
    }

    // Lower priority for references with many failed attempts
    priority -= referenceVertex.resolutionAttempts * 10;

    // Higher priority for recent references
    const age = Date.now() - referenceVertex.lastResolutionAttempt;
    if (age < 60000) {
      // Less than 1 minute
      priority += 20;
    }

    return Math.max(0, priority);
  }

  /**
   * Dequeue the highest priority task
   */
  private dequeueHighestPriorityTask(): LazyResolutionTask | null {
    if (this.lazyResolutionQueue.length === 0) {
      return null;
    }

    // Sort by priority (highest first) and timestamp (oldest first for same priority)
    this.lazyResolutionQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Older timestamp first
    });

    return this.lazyResolutionQueue.shift() || null;
  }

  /**
   * Attempt to resolve a queued task
   */
  private attemptResolution(
    task: LazyResolutionTask,
    symbolLookup: (name: string) => ApexSymbol[],
    fileLookup: (filePath: string) => ApexSymbol[],
  ): void {
    const { referenceVertex } = task;

    // Check if we've exceeded max attempts
    if (referenceVertex.resolutionAttempts >= this.maxResolutionAttempts) {
      this.logger.debug(
        () => `Max resolution attempts exceeded for ${referenceVertex.name}`,
      );
      this.processedReferences.add(referenceVertex.id);
      return;
    }

    // Check if we've exceeded timeout
    const timeSinceLastAttempt =
      Date.now() - referenceVertex.lastResolutionAttempt;
    if (timeSinceLastAttempt < this.resolutionTimeout) {
      // Re-queue with lower priority
      referenceVertex.resolutionAttempts++;
      referenceVertex.lastResolutionAttempt = Date.now();
      this.queueForLazyResolution(referenceVertex);
      return;
    }

    // Attempt resolution
    referenceVertex.resolutionAttempts++;
    referenceVertex.lastResolutionAttempt = Date.now();

    const resolvedSymbol = this.attemptImmediateResolution(
      referenceVertex,
      symbolLookup,
      fileLookup,
    );

    if (resolvedSymbol) {
      this.markResolved(referenceVertex, resolvedSymbol);
      this.processedReferences.add(referenceVertex.id);
      this.logger.debug(
        () => `Successfully resolved reference: ${referenceVertex.name}`,
      );
    } else {
      // Re-queue for later attempt
      this.queueForLazyResolution(referenceVertex);
    }
  }

  /**
   * Mark a reference as resolved
   */
  private markResolved(
    referenceVertex: ReferenceVertex,
    symbol: ApexSymbol,
  ): void {
    referenceVertex.isResolved = true;
    referenceVertex.resolvedSymbolId = symbol.id;
    referenceVertex.resolutionErrors = [];
  }

  /**
   * Get symbol by ID using the provided lookup function
   */
  private getSymbolById(
    symbolId: string,
    symbolLookup: (name: string) => ApexSymbol[],
  ): ApexSymbol | null {
    // This is a simplified implementation - in a real system,
    // we'd have a direct symbol ID lookup
    const parts = symbolId.split(':');
    if (parts[0] === 'builtin') {
      return this.resolveBuiltInType(parts[1]);
    }

    // For now, we'll need to search by name
    // In a real implementation, we'd have a symbol ID index
    return null;
  }
}
