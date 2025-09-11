/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CodeActionParams,
  CodeAction,
  CodeActionKind,
  Range,
  Diagnostic,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for code action processing functionality
 */
export interface ICodeActionProcessor {
  /**
   * Process a code action request
   * @param params The code action parameters
   * @returns Code actions for the requested context
   */
  processCodeAction(params: CodeActionParams): Promise<CodeAction[]>;
}

/**
 * Context information for code actions
 */
export interface CodeActionContext {
  document: TextDocument;
  range: Range;
  diagnostics: Diagnostic[];
  only?: CodeActionKind[];
  triggerKind?: string;
  symbolName?: string;
  symbolKind?: string;
  currentScope: string;
  isStatic: boolean;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
}

/**
 * Service for processing code action requests using ApexSymbolManager
 */
export class CodeActionProcessingService implements ICodeActionProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a code action request
   * @param params The code action parameters
   * @returns Code actions for the requested context
   */
  public async processCodeAction(
    params: CodeActionParams,
  ): Promise<CodeAction[]> {
    this.logger.debug(
      () => `Processing code action request for: ${params.textDocument.uri}`,
    );

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Get the document
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        this.logger.warn(
          () => `Document not found: ${params.textDocument.uri}`,
        );
        return [];
      }

      // Analyze code action context
      const context = this.analyzeCodeActionContext(document, params);

      // Get code actions using ApexSymbolManager
      const codeActions = await this.getCodeActions(context);

      this.logger.debug(() => `Returning ${codeActions.length} code actions`);

      return codeActions;
    } catch (error) {
      this.logger.error(() => `Error processing code action: ${error}`);
      return [];
    }
  }

  /**
   * Analyze the code action context from the document and parameters
   */
  private analyzeCodeActionContext(
    document: TextDocument,
    params: CodeActionParams,
  ): CodeActionContext {
    const text = document.getText();
    const range = params.range;
    const offset = document.offsetAt(range.start);

    // Extract symbol information at the range
    const symbolInfo = this.extractSymbolInfo(text, range);

    // Determine context information
    const isStatic = this.isInStaticContext(text, offset);
    const accessModifier = this.getAccessModifierContext(text, offset);
    const currentScope = this.extractCurrentScope(text, offset);

    return {
      document,
      range,
      diagnostics: params.context.diagnostics,
      only: params.context.only,
      triggerKind: params.context.triggerKind?.toString(),
      symbolName: symbolInfo.name,
      symbolKind: symbolInfo.kind,
      currentScope,
      isStatic,
      accessModifier,
    };
  }

  /**
   * Get code actions using ApexSymbolManager
   */
  private async getCodeActions(
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const codeActions: CodeAction[] = [];

    try {
      // Add refactoring actions
      const refactoringActions = await this.getRefactoringActions(context);
      codeActions.push(...refactoringActions);

      // Add quick fix actions
      const quickFixActions = await this.getQuickFixActions(context);
      codeActions.push(...quickFixActions);

      // Add diagnostic-based actions
      const diagnosticActions = await this.getDiagnosticActions(context);
      codeActions.push(...diagnosticActions);

      // Add relationship-based actions
      const relationshipActions = await this.getRelationshipActions(context);
      codeActions.push(...relationshipActions);
    } catch (error) {
      this.logger.debug(() => `Error getting code actions: ${error}`);
    }

    return codeActions;
  }

  /**
   * Get refactoring actions
   */
  private async getRefactoringActions(
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    if (!context.symbolName) {
      return actions;
    }

    try {
      // Find symbol in ApexSymbolManager
      const symbols = this.symbolManager.findSymbolByName(context.symbolName);

      for (const symbol of symbols) {
        // Rename symbol action
        const renameAction: CodeAction = {
          title: `Rename ${symbol.kind} '${symbol.name}'`,
          kind: CodeActionKind.Refactor,
          command: {
            title: `Rename ${symbol.kind}`,
            command: 'apex.renameSymbol',
            arguments: [symbol.name, context.document.uri, context.range],
          },
        };
        actions.push(renameAction);

        // Extract method action (if it's a method)
        if (symbol.kind === 'method') {
          const extractAction: CodeAction = {
            title: `Extract method '${symbol.name}'`,
            kind: CodeActionKind.RefactorExtract,
            command: {
              title: 'Extract method',
              command: 'apex.extractMethod',
              arguments: [symbol.name, context.document.uri, context.range],
            },
          };
          actions.push(extractAction);
        }

        // Move to file action
        const moveAction: CodeAction = {
          title: `Move ${symbol.kind} '${symbol.name}' to separate file`,
          kind: CodeActionKind.Refactor,
          command: {
            title: 'Move to file',
            command: 'apex.moveToFile',
            arguments: [symbol.name, context.document.uri],
          },
        };
        actions.push(moveAction);
      }
    } catch (error) {
      this.logger.debug(() => `Error getting refactoring actions: ${error}`);
    }

    return actions;
  }

  /**
   * Get quick fix actions
   */
  private async getQuickFixActions(
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    if (!context.symbolName) {
      return actions;
    }

    try {
      // Find symbol in ApexSymbolManager
      const symbols = this.symbolManager.findSymbolByName(context.symbolName);

      for (const symbol of symbols) {
        // Add import statement action
        if (symbol.fqn && !symbol.fqn.startsWith('default.')) {
          const importAction: CodeAction = {
            title: `Add import for '${symbol.fqn}'`,
            kind: CodeActionKind.QuickFix,
            edit: {
              changes: {
                [context.document.uri]: [
                  {
                    range: {
                      start: { line: 0, character: 0 },
                      end: { line: 0, character: 0 },
                    },
                    newText: `import ${symbol.fqn};\n`,
                  },
                ],
              },
            },
          };
          actions.push(importAction);
        }

        // Add access modifier fix
        if (
          context.accessModifier === 'private' &&
          symbol.modifiers?.visibility !== 'private'
        ) {
          const accessFixAction: CodeAction = {
            title: `Change access modifier to '${context.accessModifier}'`,
            kind: CodeActionKind.QuickFix,
            edit: {
              changes: {
                [context.document.uri]: [
                  {
                    range: context.range,
                    newText: `${context.accessModifier} ${symbol.name}`,
                  },
                ],
              },
            },
          };
          actions.push(accessFixAction);
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting quick fix actions: ${error}`);
    }

    return actions;
  }

  /**
   * Get diagnostic-based actions
   */
  private async getDiagnosticActions(
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      // Handle circular dependency warnings
      if (diagnostic.code === 'CIRCULAR_DEPENDENCY') {
        const circularDepAction: CodeAction = {
          title: 'Analyze circular dependency',
          kind: CodeActionKind.QuickFix,
          command: {
            title: 'Analyze circular dependency',
            command: 'apex.analyzeCircularDependency',
            arguments: [context.document.uri, diagnostic.message],
          },
        };
        actions.push(circularDepAction);
      }

      // Handle high impact symbol warnings
      if (diagnostic.code === 'HIGH_IMPACT_SYMBOL') {
        const impactAction: CodeAction = {
          title: 'Show impact analysis',
          kind: CodeActionKind.QuickFix,
          command: {
            title: 'Show impact analysis',
            command: 'apex.showImpactAnalysis',
            arguments: [context.document.uri, diagnostic.message],
          },
        };
        actions.push(impactAction);
      }
    }

    return actions;
  }

  /**
   * Get relationship-based actions
   */
  private async getRelationshipActions(
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    if (!context.symbolName) {
      return actions;
    }

    try {
      // Find symbol in ApexSymbolManager
      const symbols = this.symbolManager.findSymbolByName(context.symbolName);

      for (const symbol of symbols) {
        // Get references to this symbol to determine relationship statistics
        const referencesTo = this.symbolManager.findReferencesTo(symbol);
        const totalReferences = referencesTo.length;

        // Show references action
        if (totalReferences > 0) {
          const referencesAction: CodeAction = {
            title: `Show all references (${totalReferences})`,
            kind: CodeActionKind.Source,
            command: {
              title: 'Show references',
              command: 'apex.showReferences',
              arguments: [symbol.name, context.document.uri],
            },
          };
          actions.push(referencesAction);
        }

        // Get dependency analysis
        const dependencyAnalysis =
          this.symbolManager.analyzeDependencies(symbol);

        // Show dependencies action
        if (dependencyAnalysis.dependencies.length > 0) {
          const dependenciesAction: CodeAction = {
            title: `Show dependencies (${dependencyAnalysis.dependencies.length})`,
            kind: CodeActionKind.Source,
            command: {
              title: 'Show dependencies',
              command: 'apex.showDependencies',
              arguments: [symbol.name, context.document.uri],
            },
          };
          actions.push(dependenciesAction);
        }

        // Show dependents action
        if (dependencyAnalysis.dependents.length > 0) {
          const dependentsAction: CodeAction = {
            title: `Show dependents (${dependencyAnalysis.dependents.length})`,
            kind: CodeActionKind.Source,
            command: {
              title: 'Show dependents',
              command: 'apex.showDependents',
              arguments: [symbol.name, context.document.uri],
            },
          };
          actions.push(dependentsAction);
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting relationship actions: ${error}`);
    }

    return actions;
  }

  // Helper methods for context analysis (simplified implementations)

  private extractSymbolInfo(
    text: string,
    range: Range,
  ): { name: string; kind: string } {
    // Simplified - would use AST analysis in practice
    return {
      name: 'symbol',
      kind: 'unknown',
    };
  }

  private isInStaticContext(text: string, offset: number): boolean {
    // Simplified - would use AST analysis in practice
    return false;
  }

  private getAccessModifierContext(
    text: string,
    offset: number,
  ): 'public' | 'private' | 'protected' | 'global' {
    // Simplified - would use AST analysis in practice
    return 'public';
  }

  private extractCurrentScope(text: string, offset: number): string {
    // Simplified - would use AST analysis in practice
    return 'current-scope';
  }
}
