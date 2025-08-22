/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// VS Code web extension worker following the standard pattern
import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentDiagnosticReportKind,
  type DocumentDiagnosticReport,
  DocumentSymbol,
  SymbolKind,
  Range,
} from 'vscode-languageserver/browser';

import {
  getLogger,
  setLoggerFactory,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';

import { WorkerLoggerFactory } from './utils/WorkerLoggerFactory';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection = createConnection(
  new BrowserMessageReader(self as unknown as DedicatedWorkerGlobalScope),
  new BrowserMessageWriter(self as unknown as DedicatedWorkerGlobalScope),
);

// Set up logging
setLoggerFactory(new WorkerLoggerFactory(connection));
const logger = getLogger();

// Send initial log messages
logger.info('🚀 Worker script loading...');
logger.info('✅ Connection created');

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  logger.info('🔧 Initialize request received');

  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      // Document symbol provider for outline view
      documentSymbolProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  logger.info('✅ Initialize completed');
  return result;
});

connection.onInitialized(() => {
  logger.info('🎉 Server initialized');

  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      logger.info('Workspace folder change event received.');
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Update log level from configuration
  const config = change.settings['apex-ls-ts'];
  if (config?.logLevel) {
    setLogLevel(config.logLevel);
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'languageServerExample',
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  const settings = await getDocumentSettings(textDocument.uri);

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText();
  const pattern = /\b[A-Z]{2,}\b/g;
  let m: RegExpExecArray | null;

  let problems = 0;
  const diagnostics: Diagnostic[] = [];
  while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
    problems++;
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is all uppercase.`,
      source: 'apex-ls',
    };
    if (hasDiagnosticRelatedInformationCapability) {
      diagnostic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: 'Spelling matters',
        },
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: 'Particularly for names',
        },
      ];
    }
    diagnostics.push(diagnostic);
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.languages.diagnostics.on(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (document !== undefined) {
    // Validate and get diagnostics
    await validateTextDocument(document);
    return <DocumentDiagnosticReport>{
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    };
  } else {
    // We don't know the document. We can either try to read it from disk
    // or we don't report problems for it.
    return <DocumentDiagnosticReport>{
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    };
  }
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] =>
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    [
      {
        label: 'TypeScript',
        kind: CompletionItemKind.Text,
        data: 1,
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2,
      },
      {
        label: 'Apex',
        kind: CompletionItemKind.Text,
        data: 3,
      },
    ],
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (item.data === 1) {
    item.detail = 'TypeScript details';
    item.documentation = 'TypeScript documentation';
  } else if (item.data === 2) {
    item.detail = 'JavaScript details';
    item.documentation = 'JavaScript documentation';
  } else if (item.data === 3) {
    item.detail = 'Apex details';
    item.documentation = 'Salesforce Apex documentation';
  }
  return item;
});

// Document symbol handler for outline view
connection.onDocumentSymbol((params) => {
  logger.info('📋 Document symbol request received');
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    logger.warn('⚠️ Document not found for symbol request');
    return [];
  }

  const text = document.getText();
  const symbols: DocumentSymbol[] = [];

  // Start performance timer
  logger.time?.('Document Symbol Parsing');

  // Simple Apex class and method detection
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Match class declarations
    const classMatch = trimmedLine.match(
      /^(public|private|global)?\s*(abstract|virtual|with|without\s+sharing)?\s*class\s+(\w+)/i,
    );
    if (classMatch) {
      const className = classMatch[3];
      const startPos = document.positionAt(
        text.indexOf(line) + line.indexOf(className),
      );
      const endPos = {
        line: startPos.line,
        character: startPos.character + className.length,
      };

      symbols.push({
        name: className,
        kind: SymbolKind.Class,
        range: Range.create(startPos, endPos),
        selectionRange: Range.create(startPos, endPos),
        children: [],
      });
      continue;
    }

    // Match method declarations
    const methodMatch = trimmedLine.match(
      /^(public|private|protected|global)?\s*(static|virtual|override|abstract)?\s*(\w+(\[\])?)\s+(\w+)\s*\(/i,
    );
    if (methodMatch) {
      const methodName = methodMatch[5];
      const returnType = methodMatch[3];
      const startPos = document.positionAt(
        text.indexOf(line) + line.indexOf(methodName),
      );
      const endPos = {
        line: startPos.line,
        character: startPos.character + methodName.length,
      };

      symbols.push({
        name: `${methodName}(): ${returnType}`,
        kind: SymbolKind.Method,
        range: Range.create(startPos, endPos),
        selectionRange: Range.create(startPos, endPos),
        children: [],
      });
      continue;
    }

    // Match property declarations
    const propertyMatch = trimmedLine.match(
      /^(public|private|protected|global)?\s*(static)?\s*(\w+(\[\])?)\s+(\w+)\s*[{;]/i,
    );
    if (propertyMatch) {
      const propertyName = propertyMatch[5];
      const propertyType = propertyMatch[3];
      const startPos = document.positionAt(
        text.indexOf(line) + line.indexOf(propertyName),
      );
      const endPos = {
        line: startPos.line,
        character: startPos.character + propertyName.length,
      };

      symbols.push({
        name: `${propertyName}: ${propertyType}`,
        kind: SymbolKind.Property,
        range: Range.create(startPos, endPos),
        selectionRange: Range.create(startPos, endPos),
        children: [],
      });
    }
  }

  // End performance timer
  logger.timeEnd?.('Document Symbol Parsing');

  logger.info(`✅ Found ${symbols.length} symbols`);
  return symbols;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

logger.info('🎧 Connection listening started');
logger.info('✅ Apex Language Server Worker ready!');
