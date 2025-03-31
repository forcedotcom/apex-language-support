/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as monaco from 'monaco-editor';
import { ApexBrowserClient } from '@salesforce/apex-lsp-browser-client';

// Global language client instance
let languageClient: ApexBrowserClient | undefined;

/**
 * Setup the Apex Language Server client and connect it to Monaco editor
 */
export function setupApexLanguageClient(
  editor: monaco.editor.IStandaloneCodeEditor,
) {
  // Create language client if not already created
  if (!languageClient) {
    try {
      // Initialize the Apex browser client
      // The actual URL will depend on your server setup
      const serverUrl = new URL(
        '/api/apex-language-server',
        window.location.href,
      );
      languageClient = new ApexBrowserClient({
        serverUri: serverUrl.toString(),
        // You can add more configuration here as needed
      });

      // Register completion provider
      monaco.languages.registerCompletionItemProvider('apex', {
        provideCompletionItems: async (model, position) => {
          if (!languageClient) {
            return { suggestions: [] };
          }

          try {
            const uri = model.uri.toString();
            const text = model.getValue();

            // Use the language client to get completions
            const completions = await languageClient.getCompletions(uri, text, {
              line: position.lineNumber - 1,
              character: position.column - 1,
            });

            // Convert language server completions to Monaco suggestions
            return {
              suggestions: completions.map((item) => ({
                label: item.label,
                kind: convertCompletionItemKind(item.kind),
                insertText: item.insertText || item.label,
                detail: item.detail,
                documentation: item.documentation,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              })),
            };
          } catch (error) {
            console.error('Error getting completions:', error);
            return { suggestions: [] };
          }
        },
      });

      // Register hover provider
      monaco.languages.registerHoverProvider('apex', {
        provideHover: async (model, position) => {
          if (!languageClient) {
            return { contents: [] };
          }

          try {
            const uri = model.uri.toString();
            const text = model.getValue();

            // Use the language client to get hover information
            const hoverInfo = await languageClient.getHoverInfo(uri, text, {
              line: position.lineNumber - 1,
              character: position.column - 1,
            });

            if (!hoverInfo) {
              return { contents: [] };
            }

            return {
              contents: [{ value: hoverInfo.contents }],
            };
          } catch (error) {
            console.error('Error getting hover info:', error);
            return { contents: [] };
          }
        },
      });

      // Register diagnostic provider
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const diagnosticCollection = monaco.editor.createModel('', 'text/plain');

      // Setup document validation
      editor.onDidChangeModelContent(async () => {
        if (!languageClient) return;

        const model = editor.getModel();
        if (!model) return;

        try {
          const uri = model.uri.toString();
          const text = model.getValue();

          // Use the language client to get diagnostics
          const diagnostics = await languageClient.validateDocument(uri, text);

          // Convert LSP diagnostics to Monaco markers
          const markers = diagnostics.map((diagnostic) => ({
            severity: convertDiagnosticSeverity(diagnostic.severity),
            startLineNumber: diagnostic.range.start.line + 1,
            startColumn: diagnostic.range.start.character + 1,
            endLineNumber: diagnostic.range.end.line + 1,
            endColumn: diagnostic.range.end.character + 1,
            message: diagnostic.message,
            source: diagnostic.source || 'apex',
          }));

          // Set markers on the model
          monaco.editor.setModelMarkers(model, 'apex', markers);
        } catch (error) {
          console.error('Error validating document:', error);
        }
      });

      console.log('Apex Language Server client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Apex Language Server client:', error);
    }
  }

  return languageClient;
}

/**
 * Helper function to convert LSP completion item kinds to Monaco completion item kinds
 */
function convertCompletionItemKind(
  kind?: number,
): monaco.languages.CompletionItemKind {
  // Map LSP CompletionItemKind to Monaco CompletionItemKind
  // See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#completionItemKind
  switch (kind) {
    case 1:
      return monaco.languages.CompletionItemKind.Text;
    case 2:
      return monaco.languages.CompletionItemKind.Method;
    case 3:
      return monaco.languages.CompletionItemKind.Function;
    case 4:
      return monaco.languages.CompletionItemKind.Constructor;
    case 5:
      return monaco.languages.CompletionItemKind.Field;
    case 6:
      return monaco.languages.CompletionItemKind.Variable;
    case 7:
      return monaco.languages.CompletionItemKind.Class;
    case 8:
      return monaco.languages.CompletionItemKind.Interface;
    case 9:
      return monaco.languages.CompletionItemKind.Module;
    case 10:
      return monaco.languages.CompletionItemKind.Property;
    case 11:
      return monaco.languages.CompletionItemKind.Unit;
    case 12:
      return monaco.languages.CompletionItemKind.Value;
    case 13:
      return monaco.languages.CompletionItemKind.Enum;
    case 14:
      return monaco.languages.CompletionItemKind.Keyword;
    case 15:
      return monaco.languages.CompletionItemKind.Snippet;
    case 16:
      return monaco.languages.CompletionItemKind.Color;
    case 17:
      return monaco.languages.CompletionItemKind.File;
    case 18:
      return monaco.languages.CompletionItemKind.Reference;
    case 19:
      return monaco.languages.CompletionItemKind.Folder;
    case 20:
      return monaco.languages.CompletionItemKind.EnumMember;
    case 21:
      return monaco.languages.CompletionItemKind.Constant;
    case 22:
      return monaco.languages.CompletionItemKind.Struct;
    case 23:
      return monaco.languages.CompletionItemKind.Event;
    case 24:
      return monaco.languages.CompletionItemKind.Operator;
    case 25:
      return monaco.languages.CompletionItemKind.TypeParameter;
    default:
      return monaco.languages.CompletionItemKind.Text;
  }
}

/**
 * Helper function to convert LSP diagnostic severity to Monaco marker severity
 */
function convertDiagnosticSeverity(severity?: number): monaco.MarkerSeverity {
  // Map LSP DiagnosticSeverity to Monaco MarkerSeverity
  // See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnosticSeverity
  switch (severity) {
    case 1:
      return monaco.MarkerSeverity.Error;
    case 2:
      return monaco.MarkerSeverity.Warning;
    case 3:
      return monaco.MarkerSeverity.Info;
    case 4:
      return monaco.MarkerSeverity.Hint;
    default:
      return monaco.MarkerSeverity.Info;
  }
}
