/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';

import {
  LayeredSymbolListenerBase,
  DetailLevel,
} from './LayeredSymbolListenerBase';
import { SymbolTable } from '../../types/symbol';
import { ApexErrorListener } from './ApexErrorListener';
import { VisibilitySymbolListener } from './VisibilitySymbolListener';

export interface ParseTreeResult {
  parseTree: CompilationUnitContext | TriggerUnitContext | BlockContext;
  errorListener: ApexErrorListener;
}

export interface ListenerApplicationOptions {
  enforceDependencies?: boolean; // Auto-include missing dependencies (default: true)
  projectNamespace?: string;
  fileUri?: string;
}

/**
 * Manages application of layered listeners to parse trees
 * Supports individual listener application or group application with dependency enforcement
 */
export class ListenerApplicationManager {
  private readonly logger = getLogger();

  /**
   * Apply a single listener to a parse tree
   * @param parseTreeResult The parse tree and error listener
   * @param listener The listener to apply
   * @param existingSymbolTable Optional existing SymbolTable to enrich
   * @param options Application options
   * @returns The SymbolTable (enriched if existingSymbolTable provided)
   */
  applyListener(
    parseTreeResult: ParseTreeResult,
    listener: LayeredSymbolListenerBase,
    existingSymbolTable?: SymbolTable,
    options: ListenerApplicationOptions = {},
  ): SymbolTable {
    const symbolTable = existingSymbolTable || new SymbolTable();

    if (options.fileUri) {
      symbolTable.setFileUri(options.fileUri);
      listener.setCurrentFileUri(options.fileUri);
    }

    if (options.projectNamespace) {
      listener.setProjectNamespace(options.projectNamespace);
    }

    listener.setErrorListener(parseTreeResult.errorListener);

    const walker = new ParseTreeWalker();
    walker.walk(listener, parseTreeResult.parseTree);

    return listener.getResult();
  }

  /**
   * Apply multiple listeners as a group to the same parse tree
   * @param parseTreeResult The parse tree and error listener
   * @param listeners The listeners to apply (in order)
   * @param existingSymbolTable Optional existing SymbolTable to enrich
   * @param options Application options including dependency enforcement
   * @returns The enriched SymbolTable
   */
  applyListenerGroup(
    parseTreeResult: ParseTreeResult,
    listeners: LayeredSymbolListenerBase[],
    existingSymbolTable?: SymbolTable,
    options: ListenerApplicationOptions = {},
  ): SymbolTable {
    const enforceDependencies = options.enforceDependencies !== false; // Default: true

    // If dependency enforcement is enabled, ensure all required listeners are included
    const listenersToApply = enforceDependencies
      ? this.ensureListenerDependencies(listeners, existingSymbolTable)
      : listeners;

    this.logger.debug(
      () =>
        `Applying ${listenersToApply.length} listeners ` +
        `(requested: ${listeners.length}, after dependencies: ${listenersToApply.length})`,
    );

    let symbolTable = existingSymbolTable || new SymbolTable();

    if (options.fileUri) {
      symbolTable.setFileUri(options.fileUri);
    }

    const walker = new ParseTreeWalker();

    // Apply each listener in sequence, enriching the same SymbolTable
    for (const listener of listenersToApply) {
      if (options.fileUri) {
        listener.setCurrentFileUri(options.fileUri);
      }

      if (options.projectNamespace) {
        listener.setProjectNamespace(options.projectNamespace);
      }

      listener.setErrorListener(parseTreeResult.errorListener);

      // Use the same SymbolTable instance for enrichment
      const listenerSymbolTable = listener.getResult();
      if (listenerSymbolTable !== symbolTable) {
        // If listener created a new SymbolTable, merge symbols into our table
        // This shouldn't happen if we pass symbolTable to constructor, but handle it
        const allSymbols = listenerSymbolTable.getAllSymbols();
        for (const symbol of allSymbols) {
          symbolTable.addSymbol(symbol, null);
        }
      }

      // Walk the parse tree with this listener
      walker.walk(listener, parseTreeResult.parseTree);

      this.logger.debug(
        () =>
          `Applied ${listener.getDetailLevel()} listener, ` +
          `symbols: ${symbolTable.getAllSymbols().length}`,
      );
    }

    return symbolTable;
  }

  /**
   * Ensure all required dependency listeners are included
   * If listener for layer n is requested, include listeners for all layers < n
   */
  private ensureListenerDependencies(
    requestedListeners: LayeredSymbolListenerBase[],
    existingSymbolTable?: SymbolTable,
  ): LayeredSymbolListenerBase[] {
    const layerOrder: Record<DetailLevel, number> = {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };

    // Get detail levels from requested listeners
    const requestedLevels = new Set<DetailLevel>();
    for (const listener of requestedListeners) {
      requestedLevels.add(listener.getDetailLevel());
    }

    // Check existing SymbolTable for already-processed detail levels
    const existingLevels = new Set<DetailLevel>();
    if (existingSymbolTable) {
      const symbols = existingSymbolTable.getAllSymbols();
      for (const symbol of symbols) {
        if (symbol._detailLevel) {
          existingLevels.add(symbol._detailLevel);
        }
      }
    }

    // Determine which detail levels need listeners
    const neededLevels = new Set<DetailLevel>();

    for (const requestedLevel of requestedLevels) {
      const requestedNum = layerOrder[requestedLevel] || 0;

      // Add all dependency layers
      for (const [level, num] of Object.entries(layerOrder)) {
        if (num < requestedNum) {
          const levelTyped = level as DetailLevel;
          // Only add if not already processed
          if (!existingLevels.has(levelTyped)) {
            neededLevels.add(levelTyped);
          }
        }
      }

      // Add the requested level itself if not already processed
      if (!existingLevels.has(requestedLevel)) {
        neededLevels.add(requestedLevel);
      }
    }

    // Create listeners for needed levels
    const symbolTable = existingSymbolTable || new SymbolTable();
    const listeners: LayeredSymbolListenerBase[] = [];

    // Add in order
    if (neededLevels.has('public-api')) {
      listeners.push(new VisibilitySymbolListener('public-api', symbolTable));
    }
    if (neededLevels.has('protected')) {
      listeners.push(new VisibilitySymbolListener('protected', symbolTable));
    }
    if (neededLevels.has('private')) {
      listeners.push(new VisibilitySymbolListener('private', symbolTable));
    }

    // Add any requested listeners that weren't in the dependency chain
    // (e.g., if someone explicitly passes a listener)
    for (const listener of requestedListeners) {
      const level = listener.getDetailLevel();
      if (!neededLevels.has(level)) {
        // This listener's level was already processed, skip it
        continue;
      }
      // Check if we already created a listener for this level
      const alreadyCreated = listeners.some(
        (l) => l.getDetailLevel() === level,
      );
      if (!alreadyCreated) {
        listeners.push(listener);
      }
    }

    return listeners;
  }

  /**
   * Create listeners for specified detail levels
   * @param levels The detail levels to create listeners for
   * @param symbolTable Optional existing SymbolTable to use
   * @returns Array of listeners in order
   */
  createListenersForLevels(
    levels: DetailLevel[],
    symbolTable?: SymbolTable,
  ): LayeredSymbolListenerBase[] {
    const table = symbolTable || new SymbolTable();
    const listeners: LayeredSymbolListenerBase[] = [];

    for (const level of levels) {
      switch (level) {
        case 'public-api':
          listeners.push(new VisibilitySymbolListener('public-api', table));
          break;
        case 'protected':
          listeners.push(new VisibilitySymbolListener('protected', table));
          break;
        case 'private':
          listeners.push(new VisibilitySymbolListener('private', table));
          break;
        case 'full':
          // For 'full', would use ApexSymbolCollectorListener
          // But that's not a LayeredSymbolListenerBase, so skip for now
          this.logger.warn(
            () =>
              "'full' detail level not supported in createListenersForLevels",
          );
          break;
      }
    }

    return listeners;
  }
}
