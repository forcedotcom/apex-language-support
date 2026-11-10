/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  CodeAction,
  CodeActionParams,
  CodeLens,
  CodeLensParams,
  Command,
  CompletionItem,
  CompletionList,
  CompletionParams,
  Definition,
  DefinitionParams,
  Diagnostic,
  DocumentSymbol,
  DocumentSymbolParams,
  ExecuteCommandParams,
  FoldingRange,
  FoldingRangeParams,
  Hover,
  HoverParams,
  ImplementationParams,
  Location,
  LocationLink,
  PrepareRenameParams,
  PrepareRenameResult,
  ReferenceParams,
  RenameParams,
  SemanticTokens,
  SemanticTokensParams,
  SignatureHelp,
  SignatureHelpParams,
  SymbolInformation,
  TextDocumentIdentifier,
  WorkspaceEdit,
  WorkspaceSymbol,
  WorkspaceSymbolParams,
} from 'vscode-languageserver-protocol';
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
  LSPRequestType,
} from '@salesforce/apex-lsp-shared';
import type {
  DocumentLoadParams,
  DocumentLoadResult,
} from '../services/DocumentLoadProcessingService';
import type { PrerequisiteEnrichmentParams } from '../services/PrerequisiteEnrichmentService';

/**
 * The coordinator accepts editor events and test snapshots, rather than raw
 * LSP notification payloads, because it needs the current full document text.
 */
type DocumentEventParams = {
  readonly document?: {
    readonly uri: string;
    readonly languageId?: string;
    readonly version?: number;
    readonly getText?: () => string;
  };
  readonly textDocument?: TextDocumentIdentifier & {
    readonly version?: number;
  };
  readonly text?: string;
};

type SemanticTokensDispatchParams = SemanticTokensParams & {
  readonly semanticTokenLegend: {
    readonly tokenTypes: readonly string[];
    readonly tokenModifiers: readonly string[];
  };
};

type CompilationResult = {
  readonly compiledCount: number;
  readonly elapsedMs: number;
};

type DocumentCloseResult = { readonly accepted: boolean };

type ReferenceDispatchParams = Omit<ReferenceParams, 'context'> & {
  // The dispatcher preserves the current compatibility default of false.
  readonly context?: ReferenceParams['context'];
};

type PoolDocumentParams = {
  readonly content?: string;
};

type CoordinatorOnlyRequestType =
  | 'documentLoad'
  | 'executeCommand'
  | 'findMissingArtifact'
  | 'foldingRange'
  | 'prerequisiteEnrichment'
  | 'resolve'
  | 'workspaceSymbol';

/**
 * Closed request/result pairs supported by the worker dispatcher.
 *
 * Standard LSP operations use protocol types. Lifecycle and Apex-specific
 * operations use their actual repository contracts rather than lookalike LSP
 * notification or request shapes.
 */
export type LSPDispatchRequest =
  | {
      readonly type: 'hover';
      readonly params: HoverParams;
      readonly result: Hover | null;
    }
  | {
      readonly type: 'completion';
      readonly params: CompletionParams;
      readonly result: CompletionList | CompletionItem[] | null;
    }
  | {
      readonly type: 'definition';
      readonly params: DefinitionParams;
      readonly result: Definition | LocationLink[] | null;
    }
  | {
      readonly type: 'implementation';
      readonly params: ImplementationParams;
      readonly result: Definition | LocationLink[] | null;
    }
  | {
      readonly type: 'references';
      readonly params: ReferenceDispatchParams;
      readonly result: Location[] | null;
    }
  | {
      readonly type: 'documentSymbol';
      readonly params: DocumentSymbolParams;
      readonly result: DocumentSymbol[] | SymbolInformation[] | null;
    }
  | {
      readonly type: 'semanticTokens';
      readonly params: SemanticTokensDispatchParams;
      readonly result: SemanticTokens | null;
    }
  | {
      readonly type: 'workspaceSymbol';
      readonly params: WorkspaceSymbolParams;
      readonly result: SymbolInformation[] | WorkspaceSymbol[] | null;
    }
  // The adapter wraps these diagnostics in a DocumentDiagnosticReport.
  | {
      readonly type: 'diagnostics';
      readonly params: { readonly textDocument: TextDocumentIdentifier };
      readonly result: Diagnostic[];
    }
  | {
      readonly type: 'codeAction';
      readonly params: CodeActionParams;
      readonly result: (Command | CodeAction)[] | null;
    }
  | {
      readonly type: 'signatureHelp';
      readonly params: SignatureHelpParams;
      readonly result: SignatureHelp | null;
    }
  | {
      readonly type: 'rename';
      readonly params: RenameParams & PoolDocumentParams;
      readonly result: WorkspaceEdit | null;
    }
  | {
      readonly type: 'prepareRename';
      readonly params: PrepareRenameParams & PoolDocumentParams;
      readonly result: PrepareRenameResult | null;
    }
  | {
      readonly type: 'codeLens';
      readonly params: CodeLensParams;
      readonly result: CodeLens[] | null;
    }
  | {
      readonly type: 'foldingRange';
      readonly params: FoldingRangeParams;
      readonly result: FoldingRange[] | null;
    }
  | {
      readonly type: 'documentOpen';
      readonly params: DocumentEventParams;
      readonly result: CompilationResult;
    }
  | {
      readonly type: 'documentChange';
      readonly params: DocumentEventParams;
      readonly result: CompilationResult;
    }
  | {
      readonly type: 'documentSave';
      readonly params: DocumentEventParams;
      readonly result: CompilationResult;
    }
  | {
      readonly type: 'documentClose';
      readonly params: DocumentEventParams;
      readonly result: DocumentCloseResult;
    }
  | {
      readonly type: 'documentLoad';
      readonly params: DocumentLoadParams;
      readonly result: DocumentLoadResult;
    }
  | {
      readonly type: 'findMissingArtifact';
      readonly params: FindMissingArtifactParams;
      readonly result: FindMissingArtifactResult;
    }
  // Protocol execute-command results are command-specific, so keep them opaque.
  | {
      readonly type: 'executeCommand';
      readonly params: ExecuteCommandParams;
      readonly result: unknown;
    }
  | {
      readonly type: 'prerequisiteEnrichment';
      readonly params: PrerequisiteEnrichmentParams;
      readonly result: void;
    }
  | {
      readonly type: 'resolve';
      readonly params: { readonly uri: string };
      readonly result: { readonly content: string };
    }
  | {
      readonly type: 'crossFileEnrichment';
      readonly params: { readonly textDocument: TextDocumentIdentifier };
      readonly result: { readonly resolved: true };
    };

type DispatchRequestFor<T extends LSPRequestType> = Extract<
  LSPDispatchRequest,
  { readonly type: T }
>;

/** Parameters accepted for a particular dispatcher request type. */
export type LSPDispatchParams<T extends LSPRequestType> =
  DispatchRequestFor<T>['params'];

/** Result returned for a particular dispatcher request type. */
export type LSPDispatchResult<T extends LSPRequestType> =
  DispatchRequestFor<T>['result'];

/** Request types that the worker dispatcher can route outside the coordinator. */
export type WorkerDispatchType = Exclude<
  LSPRequestType,
  CoordinatorOnlyRequestType
>;

/**
 * Correlated arguments for the two-argument worker dispatcher API.
 *
 * A union of tuples prevents TypeScript from accepting params for one request
 * kind when the caller's discriminator is a union of request kinds.
 */
export type WorkerDispatchArgs = {
  [T in WorkerDispatchType]: [type: T, params: LSPDispatchParams<T>];
}[WorkerDispatchType];

/** Result inferred from a valid worker dispatcher argument tuple. */
export type WorkerDispatchResult<T extends WorkerDispatchArgs> = T extends [
  infer Type,
  LSPDispatchParams<infer _Params>,
]
  ? Type extends WorkerDispatchType
    ? LSPDispatchResult<Type>
    : never
  : never;
