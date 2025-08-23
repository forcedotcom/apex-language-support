/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Import process polyfill first for web worker compatibility
import './polyfills/process-polyfill';

// Declare process as global for TypeScript in worker context
declare const process: {
  env: { [key: string]: string | undefined };
};

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

// Conditionally import compliant services - enable one by one for testing
let dispatchProcessOnDocumentSymbol: any = null;
let dispatchProcessOnChangeDocument: any = null;
let ApexStorageManager: any = null;

// Test flag: enable specific services incrementally to isolate importScripts issue
const TEST_SERVICE_STEP = parseInt(process.env.TEST_SERVICE_STEP || '0', 10);
const _ENABLE_DEBUG_LOGS = process.env.ENABLE_DEBUG_LOGS === 'true';

// Import types separately for TypeScript but allow runtime nulls
type ApexStorageFactory = any;
type ApexStorageInterface = any;

// Track services availability
let servicesAvailable = false;

// Incrementally test compliant services to isolate importScripts issue
async function loadCompliantServices() {
  try {
    logger.info(`🔄 Testing compliant services - Step ${TEST_SERVICE_STEP}`);

    if (TEST_SERVICE_STEP === 0) {
      logger.info(
        '🔄 All compliant services disabled for compatibility testing',
      );
      servicesAvailable = false;
      return;
    }

    // Step 1: Try basic storage functionality
    if (TEST_SERVICE_STEP >= 1) {
      logger.info('📦 Step 1: Attempting to load ApexStorageManager...');
      const compliantServices = await import(
        '@salesforce/apex-lsp-compliant-services'
      );
      ApexStorageManager = compliantServices.ApexStorageManager;
      logger.info('✅ Step 1: ApexStorageManager loaded successfully');
    }

    // Step 2: Add document symbol dispatch
    if (TEST_SERVICE_STEP >= 2) {
      logger.info('🔍 Step 2: Attempting to load DocumentSymbol dispatch...');
      const compliantServices = await import(
        '@salesforce/apex-lsp-compliant-services'
      );
      dispatchProcessOnDocumentSymbol =
        compliantServices.dispatchProcessOnDocumentSymbol;
      logger.info('✅ Step 2: DocumentSymbol dispatch loaded successfully');
    }

    // Step 3: Add document change dispatch
    if (TEST_SERVICE_STEP >= 3) {
      logger.info('📝 Step 3: Attempting to load ChangeDocument dispatch...');
      const compliantServices = await import(
        '@salesforce/apex-lsp-compliant-services'
      );
      dispatchProcessOnChangeDocument =
        compliantServices.dispatchProcessOnChangeDocument;
      logger.info('✅ Step 3: ChangeDocument dispatch loaded successfully');
    }

    servicesAvailable = true;
    logger.info(
      `✅ Compliant services loaded successfully up to step ${TEST_SERVICE_STEP}`,
    );
  } catch (error) {
    logger.error(
      `❌ Failed to load compliant services at step ${TEST_SERVICE_STEP}: ${error}`,
    );
    servicesAvailable = false;
    // Don't throw - gracefully degrade
  }
}

// Performance metrics interface
interface PerformanceMetrics {
  symbolRequests: number;
  diagnosticRequests: number;
  completionRequests: number;
  averageSymbolTime: number;
  averageDiagnosticTime: number;
  averageCompletionTime: number;
  lastGcTime?: number;
}

// Initialize performance metrics
const performanceMetrics: PerformanceMetrics = {
  symbolRequests: 0,
  diagnosticRequests: 0,
  completionRequests: 0,
  averageSymbolTime: 0,
  averageDiagnosticTime: 0,
  averageCompletionTime: 0,
};

// Helper function to update metrics
function updateMetrics(operation: string, duration: number): void {
  const settings = globalSettings;
  if (!settings.performance?.enableMetrics) {
    return;
  }

  switch (operation) {
    case 'symbol':
      performanceMetrics.symbolRequests++;
      performanceMetrics.averageSymbolTime =
        (performanceMetrics.averageSymbolTime + duration) / 2;
      break;
    case 'diagnostic':
      performanceMetrics.diagnosticRequests++;
      performanceMetrics.averageDiagnosticTime =
        (performanceMetrics.averageDiagnosticTime + duration) / 2;
      break;
    case 'completion':
      performanceMetrics.completionRequests++;
      performanceMetrics.averageCompletionTime =
        (performanceMetrics.averageCompletionTime + duration) / 2;
      break;
  }

  logger.info(`📊 ${operation} completed in ${duration.toFixed(2)}ms`);

  // Log detailed metrics periodically
  if (
    performanceMetrics.symbolRequests % 10 === 0 ||
    performanceMetrics.diagnosticRequests % 10 === 0 ||
    performanceMetrics.completionRequests % 10 === 0
  ) {
    logDetailedMetrics();
  }
}

// Helper function to log detailed metrics
function logDetailedMetrics(): void {
  logger.info('📊 Performance Metrics:');
  logger.info(`Symbol Requests: ${performanceMetrics.symbolRequests}`);
  logger.info(
    `Average Symbol Time: ${performanceMetrics.averageSymbolTime.toFixed(2)}ms`,
  );
  logger.info(`Diagnostic Requests: ${performanceMetrics.diagnosticRequests}`);
  logger.info(
    `Average Diagnostic Time: ${performanceMetrics.averageDiagnosticTime.toFixed(2)}ms`,
  );
  logger.info(`Completion Requests: ${performanceMetrics.completionRequests}`);
  logger.info(
    `Average Completion Time: ${performanceMetrics.averageCompletionTime.toFixed(2)}ms`,
  );
}

// Memory monitoring
setInterval(() => {
  const memoryUsage = (performance as any).memory?.usedJSHeapSize;
  if (memoryUsage > 50 * 1024 * 1024) {
    // 50MB threshold
    logger.warn('🧹 High memory usage detected, triggering cleanup');

    // Record GC time
    performanceMetrics.lastGcTime = Date.now();

    // Trigger garbage collection if available
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }
}, 30000); // Check every 30 seconds

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

connection.onInitialized(async () => {
  logger.info('🎉 Server initialized');

  // Try to load compliant services
  await loadCompliantServices();

  if (servicesAvailable && ApexStorageManager) {
    try {
      logger.info('🚀 Initializing compliant services...');

      // Initialize storage manager if available
      if (ApexStorageManager) {
        const localStorageManager = ApexStorageManager.getInstance();
        await localStorageManager.initialize();
      }

      logger.info('✅ Services initialized successfully');
    } catch (error) {
      logger.error(`❌ Service initialization failed: ${error}`);
      logger.warn('🔄 Falling back to basic functionality');
      servicesAvailable = false;
    }
  } else {
    logger.info(
      '🔄 Using fallback implementations for web worker compatibility',
    );
    servicesAvailable = false;
  }

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

// Language server settings
interface ApexLanguageServerSettings {
  maxNumberOfProblems: number;
  services: {
    enableAdvancedParsing: boolean;
    maxFileSize: number;
    fallbackOnError: boolean;
  };
  performance: {
    enableMetrics: boolean;
  };
  logLevel: string;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: ApexLanguageServerSettings = {
  maxNumberOfProblems: 1000,
  services: {
    enableAdvancedParsing: true,
    maxFileSize: 1048576, // 1MB
    fallbackOnError: true,
  },
  performance: {
    enableMetrics: false,
  },
  logLevel: 'info',
};

let globalSettings: ApexLanguageServerSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<
  string,
  Thenable<ApexLanguageServerSettings>
> = new Map();

connection.onDidChangeConfiguration((change) => {
  logger.info('🔧 Configuration change detected');

  try {
    if (hasConfigurationCapability) {
      // Reset all cached document settings
      documentSettings.clear();
    } else {
      globalSettings = change.settings['apex-ls-ts'] || defaultSettings;
    }

    // Get the current configuration
    const config = change.settings['apex-ls-ts'];
    if (!config) {
      logger.warn('⚠️ No configuration found, using defaults');
      return;
    }

    // Update log level
    if (config.logLevel) {
      logger.info(`📝 Setting log level to: ${config.logLevel}`);
      setLogLevel(config.logLevel);
    }

    // Update service configuration
    if (config.services) {
      logger.info('🔧 Updating service configuration');

      // Apply service-specific settings
      const { enableAdvancedParsing, maxFileSize, fallbackOnError } =
        config.services;

      logger.info(
        `Advanced parsing: ${enableAdvancedParsing ? 'enabled' : 'disabled'}`,
      );
      logger.info(`Max file size: ${maxFileSize} bytes`);
      logger.info(
        `Fallback on error: ${fallbackOnError ? 'enabled' : 'disabled'}`,
      );
    }

    // Update performance monitoring
    if (config.performance?.enableMetrics) {
      logger.info('📊 Performance metrics enabled');
    }

    // Revalidate all open text documents with new settings
    logger.info('🔄 Revalidating open documents with new settings');
    documents.all().forEach(validateTextDocument);
  } catch (error) {
    logger.error(`❌ Error applying configuration: ${error}`);
    logger.warn('⚠️ Falling back to default settings');
    globalSettings = defaultSettings;
  }
});

function getDocumentSettings(
  resource: string,
): Thenable<ApexLanguageServerSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace
      .getConfiguration({
        scopeUri: resource,
        section: 'apex-ls-ts',
      })
      .then((settings) =>
        // Ensure all required settings have defaults
        ({
          ...defaultSettings,
          ...settings,
          services: {
            ...defaultSettings.services,
            ...settings?.services,
          },
          performance: {
            ...defaultSettings.performance,
            ...settings?.performance,
          },
        }),
      );
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
  logger.debug(`🔍 Validating document: ${textDocument.uri}`);

  const startTime = performance.now();
  if (servicesAvailable && dispatchProcessOnChangeDocument) {
    try {
      // Use compliant service for diagnostics
      const changeEvent = { document: textDocument, contentChanges: [] };
      const diagnostics = await dispatchProcessOnChangeDocument(changeEvent);

      if (diagnostics && diagnostics.length > 0) {
        logger.info(`📊 Found ${diagnostics.length} diagnostic issues`);
        connection.sendDiagnostics({
          uri: textDocument.uri,
          diagnostics,
        });
      } else {
        // Clear any existing diagnostics
        connection.sendDiagnostics({
          uri: textDocument.uri,
          diagnostics: [],
        });
      }

      const duration = performance.now() - startTime;
      updateMetrics('diagnostic', duration);
      return;
    } catch (error) {
      logger.error(`❌ Error in diagnostic processing: ${error}`);
      logger.warn('🔄 Falling back to basic diagnostics');
    }
  }

  // Fallback to basic diagnostics
  await validateTextDocumentFallback(textDocument);
  const duration = performance.now() - startTime;
  updateMetrics('diagnostic', duration);
}

// Fallback validation function
async function validateTextDocumentFallback(
  textDocument: TextDocument,
): Promise<void> {
  logger.warn('🔄 Using fallback diagnostic validation');

  // Get settings for max problems
  const settings = await getDocumentSettings(textDocument.uri);

  // Simple validation for demonstration (uppercase words)
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

// Enhanced completion handler with Apex-specific suggestions
connection.onCompletion(
  async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
    logger.debug('💡 Completion request received');

    const startTime = performance.now();
    try {
      // Get the document and current line text
      const document = documents.get(params.textDocument.uri);
      if (!document) {
        return [];
      }

      const position = params.position;
      const text = document.getText();
      const lines = text.split('\n');
      const currentLine = lines[position.line];
      const linePrefix = currentLine.slice(0, position.character);

      // Start with common Apex completions
      const completions: CompletionItem[] = [
        // Common Apex statements
        {
          label: 'System.debug',
          kind: CompletionItemKind.Method,
          detail: 'System debugging method',
          documentation: 'Outputs a debug message to the debug log',
          insertText: 'System.debug($0);',
          insertTextFormat: 2, // Snippet
          data: 1,
        },
        {
          label: 'if',
          kind: CompletionItemKind.Snippet,
          detail: 'If statement',
          documentation: 'Creates an if statement block',
          insertText: 'if ($1) {\n\t$0\n}',
          insertTextFormat: 2,
          data: 2,
        },
        {
          label: 'for',
          kind: CompletionItemKind.Snippet,
          detail: 'For loop',
          documentation: 'Creates a for loop',
          insertText: 'for ($1) {\n\t$0\n}',
          insertTextFormat: 2,
          data: 3,
        },

        // Common Apex types
        {
          label: 'List<>',
          kind: CompletionItemKind.Class,
          detail: 'List collection type',
          documentation: 'A generic list collection',
          insertText: 'List<${1:Type}> ${2:name} = new List<${1:Type}>();$0',
          insertTextFormat: 2,
          data: 4,
        },
        {
          label: 'Set<>',
          kind: CompletionItemKind.Class,
          detail: 'Set collection type',
          documentation: 'A generic set collection',
          insertText: 'Set<${1:Type}> ${2:name} = new Set<${1:Type}>();$0',
          insertTextFormat: 2,
          data: 5,
        },
        {
          label: 'Map<,>',
          kind: CompletionItemKind.Class,
          detail: 'Map collection type',
          documentation: 'A generic map collection',
          insertText:
            'Map<${1:KeyType}, ${2:ValueType}> ${3:name} = new Map<${1:KeyType}, ${2:ValueType}>();$0',
          insertTextFormat: 2,
          data: 6,
        },

        // Common Apex class templates
        {
          label: 'class',
          kind: CompletionItemKind.Snippet,
          detail: 'Class declaration',
          documentation: 'Creates a new Apex class',
          insertText: 'public class ${1:ClassName} {\n\t$0\n}',
          insertTextFormat: 2,
          data: 7,
        },
        {
          label: 'test class',
          kind: CompletionItemKind.Snippet,
          detail: 'Test class declaration',
          documentation: 'Creates a new Apex test class',
          insertText:
            '@IsTest\nprivate class ${1:ClassName}Test {\n\t@IsTest\n\tstatic void ${2:testMethod}() {\n\t\t$0\n\t}\n}',
          insertTextFormat: 2,
          data: 8,
        },

        // Common Apex annotations
        {
          label: '@AuraEnabled',
          kind: CompletionItemKind.Keyword,
          detail: 'AuraEnabled annotation',
          documentation: 'Makes a method accessible from Lightning components',
          data: 9,
        },
        {
          label: '@TestSetup',
          kind: CompletionItemKind.Keyword,
          detail: 'TestSetup annotation',
          documentation: 'Marks a method as a test setup method',
          data: 10,
        },
        {
          label: '@InvocableMethod',
          kind: CompletionItemKind.Keyword,
          detail: 'InvocableMethod annotation',
          documentation:
            'Makes a method invocable from Flow and Process Builder',
          data: 11,
        },
      ];

      // Add context-specific completions based on line prefix
      if (linePrefix.trim().endsWith('new ')) {
        completions.push(
          {
            label: 'List<>()',
            kind: CompletionItemKind.Constructor,
            detail: 'List constructor',
            insertText: 'List<${1:Type}>();$0',
            insertTextFormat: 2,
            data: 12,
          },
          {
            label: 'Set<>()',
            kind: CompletionItemKind.Constructor,
            detail: 'Set constructor',
            insertText: 'Set<${1:Type}>();$0',
            insertTextFormat: 2,
            data: 13,
          },
          {
            label: 'Map<,>()',
            kind: CompletionItemKind.Constructor,
            detail: 'Map constructor',
            insertText: 'Map<${1:KeyType}, ${2:ValueType}>();$0',
            insertTextFormat: 2,
            data: 14,
          },
        );
      }

      // Add SOQL-specific completions if line starts with [ or SELECT
      if (
        linePrefix.trim().startsWith('[') ||
        linePrefix.trim().toUpperCase().startsWith('SELECT')
      ) {
        completions.push(
          {
            label: 'SELECT Id FROM',
            kind: CompletionItemKind.Snippet,
            detail: 'Basic SOQL query',
            insertText: 'SELECT Id FROM ${1:Object__c}$0',
            insertTextFormat: 2,
            data: 15,
          },
          {
            label: 'WHERE',
            kind: CompletionItemKind.Keyword,
            detail: 'SOQL WHERE clause',
            data: 16,
          },
          {
            label: 'ORDER BY',
            kind: CompletionItemKind.Keyword,
            detail: 'SOQL ORDER BY clause',
            data: 17,
          },
          {
            label: 'LIMIT',
            kind: CompletionItemKind.Keyword,
            detail: 'SOQL LIMIT clause',
            data: 18,
          },
        );
      }

      logger.info(`✅ Generated ${completions.length} completion items`);

      const duration = performance.now() - startTime;
      updateMetrics('completion', duration);

      return completions;
    } catch (error) {
      logger.error(`❌ Error in completion processing: ${error}`);

      const fallbackResult = getApexCompletionFallback();

      const duration = performance.now() - startTime;
      updateMetrics('completion', duration);

      return fallbackResult;
    }
  },
);

// Enhanced completion resolve handler
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  // Add more detailed documentation based on the completion type
  switch (item.data) {
    case 1: // System.debug
      item.documentation = {
        kind: 'markdown',
        value:
          '# System.debug\n\nOutputs a message to the debug log.\n\n## Usage\n' +
          "```apex\nSystem.debug('Message');\nSystem.debug(LoggingLevel.DEBUG, 'Message');\n```",
      };
      break;
    case 2: // if statement
      item.documentation = {
        kind: 'markdown',
        value:
          '# If Statement\n\nExecutes code conditionally based on a Boolean expression.\n\n' +
          '## Example\n```apex\nif (condition) {\n    // code\n}\n```',
      };
      break;
    case 3: // for loop
      item.documentation = {
        kind: 'markdown',
        value:
          '# For Loop\n\nIterates over a collection or range.\n\n## Examples\n' +
          '```apex\n// List iteration\nfor (Type item : list) {\n    // code\n}\n\n' +
          '// Integer range\nfor (Integer i = 0; i < n; i++) {\n    // code\n}\n```',
      };
      break;
    // Add more detailed documentation for other items...
  }
  return item;
});

// Fallback completion items
function getApexCompletionFallback(): CompletionItem[] {
  logger.warn('🔄 Using fallback completion items');
  return [
    {
      label: 'System.debug',
      kind: CompletionItemKind.Method,
      detail: 'System debugging method',
      documentation: 'Outputs a debug message to the debug log',
      data: 1,
    },
    {
      label: 'List<String>',
      kind: CompletionItemKind.Class,
      detail: 'List collection type',
      documentation: 'A generic list collection for String objects',
      data: 2,
    },
    {
      label: 'public class',
      kind: CompletionItemKind.Snippet,
      detail: 'Public class declaration',
      documentation: 'Creates a new public Apex class',
      data: 3,
    },
  ];
}

// Document symbol handler for outline view
connection.onDocumentSymbol(async (params) => {
  logger.info('📋 Document symbol request received');

  const startTime = performance.now();
  try {
    // Use the compliant service for document symbols
    const result = await dispatchProcessOnDocumentSymbol(params);

    const duration = performance.now() - startTime;
    updateMetrics('symbol', duration);

    logger.info(
      `✅ Found ${result?.length || 0} symbols using compliant services`,
    );
    return result;
  } catch (error) {
    logger.error(`❌ Error in document symbol processing: ${error}`);

    // Fallback to basic implementation if service fails
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const fallbackResult = await generateFallbackSymbols(document);

    const duration = performance.now() - startTime;
    updateMetrics('symbol', duration);

    return fallbackResult;
  }
});

// Fallback function for error cases
async function generateFallbackSymbols(
  document: TextDocument,
): Promise<DocumentSymbol[]> {
  logger.warn('🔄 Using fallback symbol detection');

  const text = document.getText();
  const symbols: DocumentSymbol[] = [];

  // Start performance timer
  logger.time?.('Fallback Symbol Parsing');

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
  logger.timeEnd?.('Fallback Symbol Parsing');

  logger.info(`✅ Found ${symbols.length} symbols using fallback`);
  return symbols;
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Initialize storage manager and document handlers
const storageFactory: ApexStorageFactory = (_options: any) => {
  // Create a simple in-memory storage implementation
  const storage: ApexStorageInterface = {
    initialize: async () => {},
    shutdown: async () => {},
    storeAst: async () => true,
    retrieveAst: async () => null,
    storeTypeInfo: async () => true,
    retrieveTypeInfo: async () => null,
    storeReference: async () => true,
    findReferencesTo: async () => [],
    findReferencesFrom: async () => [],
    clearFile: async () => true,
    persist: async () => {},
    getDocument: async (uri: string) => documents.get(uri) || null,
    setDocument: async () => true,
    setDefinition: async () => true,
    setReferences: async () => true,
    getReferences: async () => [],
  };
  return storage;
};

let storageManager: any = null;

// Initialize storage manager if ApexStorageManager is available
if (ApexStorageManager) {
  storageManager = ApexStorageManager.getInstance({
    storageFactory,
    autoPersistIntervalMs: 30000, // Auto-persist every 30 seconds
  });
}

// Handle document lifecycle events
documents.onDidOpen(async (event) => {
  logger.info(`📂 Document opened: ${event.document.uri}`);
  if (storageManager) {
    await storageManager
      .getStorage()
      .setDocument(event.document.uri, event.document);
  }
});

documents.onDidChangeContent(async (event) => {
  logger.debug(`📝 Document changed: ${event.document.uri}`);
  if (storageManager) {
    await storageManager
      .getStorage()
      .setDocument(event.document.uri, event.document);
  }
});

documents.onDidClose(async (event) => {
  logger.info(`🗑️ Document closed: ${event.document.uri}`);
  if (storageManager) {
    await storageManager.getStorage().clearFile(event.document.uri);
  }
});

// Listen on the connection
connection.listen();

logger.info('🎧 Connection listening started');
logger.info('✅ Apex Language Server Worker ready!');
