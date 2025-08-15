/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Web-compatible LSP protocol types
 * This file provides the minimal LSP types needed for web environments
 * without any Node.js dependencies.
 */

// Basic LSP types
export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface TextDocumentIdentifier {
  uri: string;
}

export interface VersionedTextDocumentIdentifier
  extends TextDocumentIdentifier {
  version: number;
}

export interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

// Message types
export enum MessageType {
  Error = 1,
  Warning = 2,
  Info = 3,
  Log = 4,
}

// Initialize types
export interface ClientCapabilities {
  workspace?: any;
  textDocument?: any;
  window?: any;
  general?: any;
  experimental?: any;
}

export interface InitializeParams {
  processId?: number | null;
  clientInfo?: {
    name: string;
    version?: string;
  };
  locale?: string;
  rootPath?: string | null;
  rootUri: string | null;
  capabilities: ClientCapabilities;
  initializationOptions?: any;
  trace?: 'off' | 'messages' | 'verbose';
  workspaceFolders?: WorkspaceFolder[] | null;
}

export interface WorkspaceFolder {
  uri: string;
  name: string;
}

// Server capabilities
export interface ServerCapabilities {
  textDocumentSync?: any;
  hoverProvider?: boolean;
  completionProvider?: any;
  signatureHelpProvider?: any;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentHighlightProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
  codeActionProvider?: any;
  codeLensProvider?: any;
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  documentOnTypeFormattingProvider?: any;
  renameProvider?: any;
  documentLinkProvider?: any;
  executeCommandProvider?: any;
  experimental?: any;
  foldingRangeProvider?: boolean;
  diagnosticProvider?: any;
}

export interface InitializeResult {
  capabilities: ServerCapabilities;
  serverInfo?: {
    name: string;
    version?: string;
  };
}

// Document Symbol types
export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

export interface SymbolInformation {
  name: string;
  kind: SymbolKind;
  tags?: any[];
  deprecated?: boolean;
  location: Location;
  containerName?: string;
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  tags?: any[];
  deprecated?: boolean;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export interface DocumentSymbolParams {
  textDocument: TextDocumentIdentifier;
}

// Diagnostic types
export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: string | number;
  codeDescription?: {
    href: string;
  };
  source?: string;
  message: string;
  tags?: any[];
  relatedInformation?: DiagnosticRelatedInformation[];
  data?: any;
}

export interface DocumentDiagnosticParams {
  textDocument: TextDocumentIdentifier;
  identifier?: string;
  previousResultId?: string;
}

// Folding Range types
export enum FoldingRangeKind {
  Comment = 'comment',
  Imports = 'imports',
  Region = 'region',
}

export interface FoldingRange {
  startLine: number;
  startCharacter?: number;
  endLine: number;
  endCharacter?: number;
  kind?: string;
}

export interface FoldingRangeParams {
  textDocument: TextDocumentIdentifier;
}

// Notification types
export interface InitializedParams {}

export interface ShowMessageParams {
  type: MessageType;
  message: string;
}

// Document change types
export interface TextDocumentItem {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

export interface TextDocumentContentChangeEvent {
  range?: Range;
  rangeLength?: number;
  text: string;
}

export interface DidOpenTextDocumentParams {
  textDocument: TextDocumentItem;
}

export interface DidChangeTextDocumentParams {
  textDocument: VersionedTextDocumentIdentifier;
  contentChanges: TextDocumentContentChangeEvent[];
}

export interface DidCloseTextDocumentParams {
  textDocument: TextDocumentIdentifier;
}

export interface DidSaveTextDocumentParams {
  textDocument: TextDocumentIdentifier;
  text?: string;
}

// Connection interface (comprehensive)
export interface Connection {
  onInitialize(
    handler: (
      params: InitializeParams,
    ) => InitializeResult | Promise<InitializeResult>,
  ): void;
  onInitialized(handler: (params: InitializedParams) => void): void;
  onDocumentSymbol(
    handler: (
      params: DocumentSymbolParams,
    ) =>
      | (SymbolInformation | DocumentSymbol)[]
      | null
      | Promise<(SymbolInformation | DocumentSymbol)[] | null>,
  ): void;
  onFoldingRanges(
    handler: (
      params: FoldingRangeParams,
    ) => FoldingRange[] | null | Promise<FoldingRange[] | null>,
  ): void;
  onCompletion(handler: (params: any) => any): void;
  onHover(handler: (params: any) => any): void;
  onRequest(method: string, handler: (params: any) => any): void;
  onNotification(method: string, handler: (params: any) => void): void;
  onShutdown(handler: () => void): void;
  onExit(handler: () => void): void;
  sendRequest(method: string, params?: any): Promise<any>;
  sendNotification(method: string, params?: any): void;
  sendDiagnostics(params: { uri: string; diagnostics: Diagnostic[] }): void;
  sendProgress(type: any, token: any, value: any): void;
  onProgress(type: any, token: any, handler: (params: any) => void): void;
  listen(): void;
}

// Document change event interface
export interface TextDocumentChangeEvent<T> {
  document: T;
}
