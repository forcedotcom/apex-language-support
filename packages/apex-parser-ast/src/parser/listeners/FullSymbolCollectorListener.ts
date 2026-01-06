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

import { BaseApexParserListener } from './BaseApexParserListener';
import { ApexErrorListener } from './ApexErrorListener';
import { PublicAPISymbolListener } from './PublicAPISymbolListener';
import { ProtectedSymbolListener } from './ProtectedSymbolListener';
import { PrivateSymbolListener } from './PrivateSymbolListener';
import { ApexReferenceCollectorListener } from './ApexReferenceCollectorListener';
import { BlockContentListener } from './BlockContentListener';
import { ApexReferenceResolver } from '../references/ApexReferenceResolver';
import { SymbolTable } from '../../types/symbol';

interface SemanticError {
  type: 'semantic';
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  fileUri: string;
}

/**
 * Full symbol collector listener that uses layered listeners + reference collector + resolver
 * to achieve feature parity with ApexSymbolCollectorListener.
 *
 * This wrapper internally uses:
 * - PublicAPISymbolListener (Layer 1)
 * - ProtectedSymbolListener (Layer 2)
 * - PrivateSymbolListener (Layer 3)
 * - ApexReferenceCollectorListener (declaration reference collection via delegation)
 * - BlockContentListener (block-level symbol table population as separate pass)
 * - ApexReferenceResolver (reference resolution)
 *
 */
export class FullSymbolCollectorListener extends BaseApexParserListener<SymbolTable> {
  private readonly logger = getLogger();
  private symbolTable: SymbolTable;
  private currentFilePath: string = '';
  protected projectNamespace: string | undefined = undefined;
  private enableReferenceCorrection: boolean = true;
  protected errorListener: ApexErrorListener | null = null;

  // Internal listeners
  private publicAPIListener: PublicAPISymbolListener;
  private protectedListener: ProtectedSymbolListener;
  private privateListener: PrivateSymbolListener;
  private referenceCollector: ApexReferenceCollectorListener;
  private blockContentListener: BlockContentListener;
  private referenceResolver: ApexReferenceResolver;

  // Track if we've been walked (to know when to apply reference collection/resolution)
  private hasBeenWalked: boolean = false;
  private parseTree:
    | CompilationUnitContext
    | TriggerUnitContext
    | BlockContext
    | null = null;

  /**
   * Creates a new instance of the FullSymbolCollectorListener.
   * @param symbolTable Optional existing symbol table to use. If not provided, a new one will be created.
   */
  constructor(symbolTable?: SymbolTable) {
    super();
    this.symbolTable = symbolTable || new SymbolTable();

    // Initialize layered listeners with the same symbol table
    this.publicAPIListener = new PublicAPISymbolListener(this.symbolTable);
    this.protectedListener = new ProtectedSymbolListener(this.symbolTable);
    this.privateListener = new PrivateSymbolListener(this.symbolTable);
    this.referenceCollector = new ApexReferenceCollectorListener(
      this.symbolTable,
    );
    this.blockContentListener = new BlockContentListener(this.symbolTable);
    this.referenceResolver = new ApexReferenceResolver();
  }

  /**
   * Set the project namespace for this compilation
   */
  setProjectNamespace(namespace: string): void {
    this.projectNamespace = namespace;
    this.publicAPIListener.setProjectNamespace(namespace);
    this.protectedListener.setProjectNamespace(namespace);
    this.privateListener.setProjectNamespace(namespace);
    this.logger.debug(() => `Set project namespace to: ${namespace}`);
  }

  /**
   * Set the current file path for this compilation
   */
  setCurrentFileUri(fileUri: string): void {
    this.currentFilePath = fileUri;
    this.symbolTable.setFileUri(fileUri);
    this.publicAPIListener.setCurrentFileUri(fileUri);
    this.protectedListener.setCurrentFileUri(fileUri);
    this.privateListener.setCurrentFileUri(fileUri);
    this.referenceCollector.setCurrentFileUri(fileUri);
    this.blockContentListener.setCurrentFileUri(fileUri);
    this.logger.debug(() => `Set current file path to: ${fileUri}`);
  }

  /**
   * Set whether to enable reference correction
   * @param enabled Whether to enable reference correction (defaults to true)
   */
  setEnableReferenceCorrection(enabled: boolean): void {
    this.enableReferenceCorrection = enabled;
    this.logger.debug(
      () => `Reference correction ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Set the error listener
   */
  setErrorListener(errorListener: ApexErrorListener): void {
    this.errorListener = errorListener;
    this.publicAPIListener.setErrorListener(errorListener);
    this.protectedListener.setErrorListener(errorListener);
    this.privateListener.setErrorListener(errorListener);
    this.referenceCollector.setErrorListener(errorListener);
    this.blockContentListener.setErrorListener(errorListener);
  }

  /**
   * Get the collected symbol table
   */
  getResult(): SymbolTable {
    return this.symbolTable;
  }

  /**
   * Get all semantic errors (delegates to ApexErrorListener)
   */
  getErrors(): SemanticError[] {
    if (!this.errorListener) {
      return [];
    }
    const errors = this.errorListener.getErrors();
    return errors.map((error) => ({
      type: 'semantic' as const,
      severity:
        error.severity === 'error'
          ? 'error'
          : ('warning' as 'error' | 'warning'),
      message: error.message,
      line: error.line,
      column: error.column,
      fileUri: this.currentFilePath,
    }));
  }

  /**
   * Get all semantic warnings (delegates to ApexErrorListener)
   */
  getWarnings(): string[] {
    if (!this.errorListener) {
      return [];
    }
    const errors = this.errorListener.getErrors();
    return errors.filter((e) => e.severity === 'warning').map((e) => e.message);
  }

  /**
   * Create a new instance of this listener with a fresh SymbolTable
   */
  createNewInstance(): BaseApexParserListener<SymbolTable> {
    const newTable = new SymbolTable();
    return new FullSymbolCollectorListener(newTable);
  }

  /**
   * Apply all listeners to the parse tree
   * This is called from exitCompilationUnit/exitTriggerUnit after the parse tree is complete
   */
  private applyAllListeners(): void {
    if (!this.parseTree || this.hasBeenWalked) {
      return;
    }

    const walker = new ParseTreeWalker();

    // Apply layered listeners in order (they enrich the same SymbolTable)
    walker.walk(this.publicAPIListener, this.parseTree);
    walker.walk(this.protectedListener, this.parseTree);
    walker.walk(this.privateListener, this.parseTree);

    // Declaration references are collected via delegation from symbol listeners
    // Block-level content (local variables, block scopes, expression references) is collected as a separate pass
    walker.walk(this.blockContentListener, this.parseTree);

    // Apply reference resolver if enabled
    if (this.enableReferenceCorrection) {
      this.referenceResolver.resolveSameFileReferences(
        this.symbolTable,
        this.currentFilePath,
      );
    }

    this.hasBeenWalked = true;
  }

  // Capture parse tree when entering compilation/trigger units
  // Track modifiers/annotations during walk, then apply all listeners when exiting

  enterCompilationUnit(ctx: CompilationUnitContext): void {
    this.parseTree = ctx;
    this.hasBeenWalked = false;
  }

  exitCompilationUnit(): void {
    // Apply all listeners (walks parse tree with each listener)
    // This will process all symbols and collect references
    this.applyAllListeners();
  }

  enterTriggerUnit(ctx: TriggerUnitContext): void {
    this.parseTree = ctx;
    this.hasBeenWalked = false;
  }

  exitTriggerUnit(): void {
    // Apply all listeners (walks parse tree with each listener)
    this.applyAllListeners();
  }

  enterAnonymousUnit(ctx: BlockContext): void {
    this.parseTree = ctx;
    this.hasBeenWalked = false;
  }

  exitAnonymousUnit(): void {
    // Apply all listeners (walks parse tree with each listener)
    this.applyAllListeners();
  }
}
