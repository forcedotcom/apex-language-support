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
  Position,
  Diagnostic,
  WorkspaceEdit,
  TextEdit,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  parseForCodeActions,
  findExpressionForCodeAction,
  findConstantExtractionFromExpression,
  findMethodCallForCodeAction,
  inferTypeForCodeAction,
  nextExtractNameForCodeAction,
  CodeActionParseContext,
  ConstantExtraction,
  ApexSymbol,
  TypeSymbol,
  SymbolKind,
  SymbolVisibility,
  MethodCallAtRange,
  MethodCallReceiver,
  TypeInfo,
  ErrorCodes,
  inTypeSymbolGroup,
} from '@salesforce/apex-lsp-parser-ast';
import { toDisplayFQN } from '../utils/displayFQNUtils';

/**
 * Diagnostic codes that signal a call to a method that does not exist on the
 * receiver type — the trigger for the Declare-Missing-Method quick fix. The
 * semantic validator emits {@link ErrorCodes.INVALID_METHOD_NOT_FOUND}; the
 * uppercase variant guards against alternate code conventions in the pipeline.
 *
 * Built lazily (rather than at module load) so it does not depend on the
 * `ErrorCodes` generated object being initialized before this module — that
 * ordering is not guaranteed under the parser-ast barrel's circular exports.
 */
const methodNotFoundCodes = (): ReadonlySet<string> =>
  new Set<string>([
    ErrorCodes.INVALID_METHOD_NOT_FOUND,
    'INVALID_METHOD_NOT_FOUND',
  ]);

/** Fallback type used when an argument / return type cannot be inferred (full inference is story 01.1). */
const FALLBACK_TYPE = 'Object';

/**
 * The resolved target of a Declare-Missing-Method fix: the user class that
 * should receive the stub, the file that declares it (multi-file edit target),
 * and whether the call was made statically (on the type name).
 */
interface TargetClass {
  typeSymbol: TypeSymbol;
  fileUri: string;
  isStatic: boolean;
}

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
  currentScope?: string;
  isStatic?: boolean;
  accessModifier?: 'public' | 'private' | 'protected' | 'global';
  /** Exact semantic symbol selected at the request position. */
  selectedSymbol?: ApexSymbol;
  /**
   * Opaque, parsed-once handle from apex-parser-ast, used by the eager Extract
   * Variable / Extract Constant refactorings and the Declare-Missing-Method
   * finder. `undefined` when the document could not be parsed. The parse tree it
   * wraps stays private to apex-parser-ast; this layer only passes it to the
   * `*ForCodeAction` accessors.
   */
  parseContext?: CodeActionParseContext;
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
      const context = await this.analyzeCodeActionContext(document, params);

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
  private async analyzeCodeActionContext(
    document: TextDocument,
    params: CodeActionParams,
  ): Promise<CodeActionContext> {
    const text = document.getText();
    const range = params.range;
    let symbol: ApexSymbol | null = null;
    try {
      symbol = await this.symbolManager.getSymbolAtPosition(
        document.uri,
        {
          line: range.start.line + 1,
          character: range.start.character,
        },
        'precise',
      );
    } catch (error) {
      this.logger.debug(() => `Code-action symbol lookup failed: ${error}`);
    }

    const visibility = symbol?.modifiers?.visibility;
    const accessModifier =
      visibility === SymbolVisibility.Public ||
      visibility === SymbolVisibility.Private ||
      visibility === SymbolVisibility.Protected ||
      visibility === SymbolVisibility.Global
        ? visibility
        : undefined;
    // apex-parser-ast owns the parse: it constructs the CompilerService, chooses
    // the listener, and applies the compile options, returning an opaque handle
    // the finders consume. Parsed once here and reused across all finders.
    const parseContext = parseForCodeActions(text, document.uri) ?? undefined;
    if (!parseContext) {
      // parseForCodeActions is best-effort and swallows parse failures to stay
      // logger-free; preserve the diagnostic signal here (the LS layer owns the
      // logger) so a document that fails to parse leaves a debug trail rather
      // than silently offering no code actions.
      this.logger.debug(
        () =>
          `Unable to parse document for code actions: ${document.uri} — expression-based actions will be unavailable`,
      );
    }

    return {
      document,
      range,
      diagnostics: params.context.diagnostics,
      only: params.context.only,
      triggerKind: params.context.triggerKind?.toString(),
      symbolName: symbol?.name,
      symbolKind: symbol?.kind,
      currentScope: symbol?.parentId ?? undefined,
      isStatic: symbol?.modifiers?.isStatic,
      accessModifier,
      selectedSymbol: symbol ?? undefined,
      parseContext,
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

    // Eager (Jorje-parity) extract refactorings. These compute complete
    // WorkspaceEdits up front (no codeAction/resolve round-trip).
    //
    // NOTE: This intentionally does NOT offer command-backed Rename / Extract
    // Method / Move-to-File actions. Those were speculative stubs bound to
    // client commands (`apex.renameSymbol` / `apex.extractMethod` /
    // `apex.moveToFile`) that are registered nowhere, so invoking them failed
    // with "command not found". Symbol rename is tracked separately as a real
    // LSP feature (textDocument/rename, W-22629631); the other two have no
    // committed work. They are omitted rather than shipped half-working.
    const extractActions = this.getExtractActions(context);
    actions.push(...extractActions);

    return actions;
  }

  /**
   * Build the eager Extract Local Variable and Extract Constant code actions for
   * the current selection.
   *
   * Both are computed against the document CST via the shared
   * {@link findExpressionForCodeAction} accessor (story 05.0). When the selection is not
   * a single, well-formed expression inside a method body the finder returns
   * `null` and neither action is offered. Extract Constant is additionally gated
   * to literal (or prefix-of-literal, e.g. `-5`) expressions.
   */
  private getExtractActions(context: CodeActionContext): CodeAction[] {
    const actions: CodeAction[] = [];

    if (!context.parseContext) {
      return actions;
    }

    let found;
    try {
      found = findExpressionForCodeAction(context.parseContext, context.range);
    } catch (error) {
      this.logger.debug(() => `Extract finder error: ${error}`);
      return actions;
    }

    if (!found) {
      return actions;
    }

    // Character span + verbatim text of the expression are computed inside
    // apex-parser-ast, so this layer never touches ANTLR token internals.
    const {
      statementStart,
      indent,
      expressionStart,
      expressionEnd,
      expressionText: exprText,
    } = found;
    if (!exprText) {
      return actions;
    }

    // Replace the whole matched expression, NOT the user's raw selection. The
    // finder returns the tightest expression that *encloses* the selection, so
    // the selection can be a strict subset (or a zero-width cursor). Replacing
    // context.range while inserting the full expression text would corrupt the
    // statement (leave a fragment, or duplicate the expression). Anchor the
    // replacement to the expression's own span so the two edits stay consistent.
    const exprRange: Range = {
      start: context.document.positionAt(expressionStart),
      end: context.document.positionAt(expressionEnd),
    };

    const variableName = nextExtractNameForCodeAction(context.parseContext);
    if (!variableName) {
      return actions;
    }

    // Infer the declared type over the single parse's same-file symbol table
    // (story 01.1). Falls back to `Object` when the type cannot be resolved
    // (e.g. cross-file member access, which the cross-file seam handles later).
    let inferredType: string | null = null;
    try {
      inferredType = inferTypeForCodeAction(context.parseContext, found);
    } catch (error) {
      this.logger.debug(() => `Extract type inference error: ${error}`);
    }
    const declaredType = inferredType ?? FALLBACK_TYPE;

    const variableAction = this.buildExtractVariableAction(
      context,
      statementStart,
      indent,
      exprText,
      variableName,
      exprRange,
      declaredType,
    );
    if (variableAction) {
      actions.push(variableAction);
    }

    // The class-body insertion point, member indentation, inner-class flag, and
    // literal eligibility are all computed in apex-parser-ast so the LS layer
    // never touches ANTLR types. Reuse the expression already located above
    // (`found`) rather than re-walking the tree. Extract Constant is gated to
    // literal (or prefix-of-literal, e.g. `-5`) expressions, matching Jorje's rule.
    const constantExtraction = findConstantExtractionFromExpression(found);
    if (constantExtraction?.isLiteral) {
      const constantAction = this.buildExtractConstantAction(
        context,
        constantExtraction,
        exprText,
        variableName,
        exprRange,
        declaredType,
      );
      if (constantAction) {
        actions.push(constantAction);
      }
    }

    return actions;
  }

  /**
   * Build the Extract Local Variable WorkspaceEdit.
   *
   * Produces two TextEdits on the current document:
   *   1. an insertion of `<indent><T> <name> = <exprText>;\n` at the start of
   *      the enclosing statement's line, and
   *   2. a replacement of the selected range with `<name>`.
   *
   * `declaredType` is the inferred Apex type (story 01.1); it is `Object` when
   * the type could not be resolved from same-file information.
   */
  private buildExtractVariableAction(
    context: CodeActionContext,
    statementStart: number,
    indent: string,
    exprText: string,
    variableName: string,
    exprRange: Range,
    declaredType: string,
  ): CodeAction | null {
    const insertPosition = context.document.positionAt(statementStart);
    // Anchor the insertion at the very start of the statement's line so the new
    // declaration lands above the statement with matching indentation.
    const lineStart: Position = {
      line: insertPosition.line,
      character: 0,
    };

    const declaration = `${indent}${declaredType} ${variableName} = ${exprText};\n`;

    const insertEdit: TextEdit = {
      range: { start: lineStart, end: lineStart },
      newText: declaration,
    };
    const replaceEdit: TextEdit = {
      range: exprRange,
      newText: variableName,
    };

    return {
      title: 'Extract local variable',
      kind: CodeActionKind.RefactorExtract,
      edit: {
        changes: {
          [context.document.uri]: [insertEdit, replaceEdit],
        },
      },
    };
  }

  /**
   * Build the Extract Constant WorkspaceEdit.
   *
   * Inserts `<modifiers> <declaredType> <name> = <exprText>;` at class-body
   * level, directly under the enclosing class declaration's opening brace, and
   * replaces the selection with `<name>`. Top-level classes use `private static
   * final`; inner classes use `private final` (Apex/Jorje disallows `static` on
   * inner members). `declaredType` is the inferred Apex type (story 01.1),
   * `Object` when it could not be resolved. Returns `null` when the enclosing
   * class body cannot be located.
   */
  private buildExtractConstantAction(
    context: CodeActionContext,
    insertion: ConstantExtraction,
    exprText: string,
    variableName: string,
    exprRange: Range,
    declaredType: string,
  ): CodeAction | null {
    const modifiers = insertion.isInner
      ? 'private final'
      : 'private static final';
    const insertPosition = context.document.positionAt(insertion.insertOffset);
    const declaration =
      `\n${insertion.indent}${modifiers} ${declaredType} ${variableName} = ` +
      `${exprText};`;

    const insertEdit: TextEdit = {
      range: { start: insertPosition, end: insertPosition },
      newText: declaration,
    };
    const replaceEdit: TextEdit = {
      range: exprRange,
      newText: variableName,
    };

    return {
      title: 'Extract constant',
      kind: CodeActionKind.RefactorExtract,
      edit: {
        changes: {
          [context.document.uri]: [insertEdit, replaceEdit],
        },
      },
    };
  }

  /**
   * Get quick fix actions
   */
  private async getQuickFixActions(
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    // Declare-Missing-Method is diagnostic-driven and does not rely on the
    // (currently simplified) symbolName heuristic, so it runs first.
    try {
      const declareActions = await this.getDeclareMissingMethodActions(context);
      actions.push(...declareActions);
    } catch (error) {
      this.logger.debug(
        () => `Error getting declare-missing-method actions: ${error}`,
      );
    }

    if (!context.selectedSymbol) {
      return actions;
    }

    try {
      // The precise lookup performed during context analysis already selected
      // the semantic identity at the request position. Do not expand that
      // identity back into every workspace symbol with the same simple name.
      const symbol = context.selectedSymbol;
      // Add import statement action
      if (symbol.fqn && !symbol.fqn.startsWith('default.')) {
        const displayFQN = toDisplayFQN(symbol.fqn);
        const importAction: CodeAction = {
          title: `Add import for '${displayFQN}'`,
          kind: CodeActionKind.QuickFix,
          edit: {
            changes: {
              [context.document.uri]: [
                {
                  range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                  },
                  newText: `import ${displayFQN};\n`,
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
    } catch (error) {
      this.logger.debug(() => `Error getting quick fix actions: ${error}`);
    }

    return actions;
  }

  /**
   * Build "Declare method '<name>' in <Type>" quick fixes (Jorje QUICKFIX
   * parity). Diagnostic-driven: triggered by an unresolved-method diagnostic
   * (`invalid.method.not.found`) whose call is on a resolved *user* class.
   *
   * Requirements to offer the fix (per the story):
   * - the receiver type resolves to a user-defined class (not enum/interface,
   *   not a standard-library type);
   * - the call's result is used in a non-void position (params typed and
   *   non-void).
   *
   * The generated stub is written EAGERLY into the *target type's* declaring
   * file (multi-file edit) — Jorje uses no `codeAction/resolve`.
   */
  private async getDeclareMissingMethodActions(
    context: CodeActionContext,
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    const relevantDiagnostics = context.diagnostics.filter((d) =>
      this.isMethodNotFoundDiagnostic(d),
    );
    if (relevantDiagnostics.length === 0) {
      return actions;
    }

    // Locate and describe the call at the diagnostic range using the shared
    // CST finder. This is resilient to syntax errors (returns null).
    const callInfo = await this.findMethodCall(context, relevantDiagnostics);
    if (!callInfo) {
      return actions;
    }

    // A void-context call carries no return type to infer — not offered.
    if (
      callInfo.returnContext === 'void' ||
      callInfo.returnContext === 'expression'
    ) {
      return actions;
    }

    // Resolve the receiver type to a user-defined class and its declaring file.
    const target = await this.resolveTargetUserClass(context, callInfo);
    if (!target) {
      return actions;
    }

    const stub = this.buildMethodStub(callInfo, target);
    const edit = await this.buildDeclareMethodEdit(target, stub);
    if (!edit) {
      return actions;
    }

    actions.push({
      title: `Declare method '${callInfo.methodName}' in ${target.typeSymbol.name}`,
      kind: CodeActionKind.QuickFix,
      diagnostics: relevantDiagnostics,
      edit,
    });

    return actions;
  }

  /** True when a diagnostic reports a call to a method that does not exist. */
  private isMethodNotFoundDiagnostic(diagnostic: Diagnostic): boolean {
    const code = diagnostic.code;
    return typeof code === 'string' && methodNotFoundCodes().has(code);
  }

  /**
   * Compile the current document and locate the method call at (or overlapping)
   * one of the given diagnostics' ranges. Returns null when no call is found or
   * the source cannot be parsed into a usable CST.
   */
  private async findMethodCall(
    context: CodeActionContext,
    diagnostics: Diagnostic[],
  ): Promise<MethodCallAtRange | null> {
    // Reuse the CST already parsed in analyzeCodeActionContext rather than
    // recompiling the document. The finder only walks the parse tree, which is
    // grammar-equivalent regardless of the listener used to build it, so the
    // shared parse context is sufficient.
    const parseContext = context.parseContext;
    if (!parseContext) {
      return null;
    }

    // Prefer the code-action request range, then each diagnostic range.
    const ranges: Range[] = [context.range, ...diagnostics.map((d) => d.range)];
    for (const range of ranges) {
      const call = findMethodCallForCodeAction(parseContext, range);
      if (call) {
        return call;
      }
    }
    return null;
  }

  /**
   * Resolve the call's receiver to a user-defined class and its declaring
   * document URI — the multi-file integration point.
   *
   * - Qualified call `receiver.method(...)`: the parser-correlated receiver
   *   node is resolved at its exact range via the symbol manager.
   * - Unqualified call `method(...)`: an implicit-`this` call, so the target is
   *   the enclosing class (the current document's own type). Instance call.
   *
   * Returns null when the type cannot be resolved, is not a class (enum /
   * interface), is a standard-library type, or has no declaring file.
   */
  private async resolveTargetUserClass(
    context: CodeActionContext,
    callInfo: MethodCallAtRange,
  ): Promise<TargetClass | null> {
    if (callInfo.receiver) {
      return this.resolveReceiverType(context, callInfo.receiver);
    }

    // Unqualified call -> lexically enclosing class; instance call. A source
    // file may contain nested classes, so "first class in file" is not a
    // semantic substitute for the containing type.
    const currentType = await this.findContainingType(
      context.document.uri,
      context.range.start,
    );
    if (!currentType) {
      return null;
    }
    return {
      typeSymbol: currentType,
      fileUri: currentType.fileUri,
      isStatic: false,
    };
  }

  /**
   * Resolve the parser-recorded immediate receiver node to its user class.
   * Same-file parser facts are preferred; otherwise the exact identifier range
   * is handed to the symbol manager. No file-wide name matching is performed.
   */
  private async resolveReceiverType(
    context: CodeActionContext,
    receiver: MethodCallReceiver,
  ): Promise<TargetClass | null> {
    let receiverSymbol: ApexSymbol | null = null;
    try {
      receiverSymbol = await this.symbolManager.getSymbolAtPosition(
        context.document.uri,
        {
          // MethodCallReceiver exposes an LSP range (0-based line); the parser
          // symbol manager consumes parser positions (1-based line).
          line: receiver.range.start.line + 1,
          character: receiver.range.start.character,
        },
        'precise',
      );
    } catch (error) {
      this.logger.debug(() => `Code-action receiver lookup failed: ${error}`);
    }
    if (!receiverSymbol) {
      const parserResolvedType = receiver.declaredTypeName
        ? await this.findUserClassByIdentity(receiver.declaredTypeName)
        : null;
      return parserResolvedType
        ? {
            typeSymbol: parserResolvedType,
            fileUri: parserResolvedType.fileUri,
            isStatic: receiver.kind === 'type',
          }
        : null;
    }

    if (inTypeSymbolGroup(receiverSymbol)) {
      if (!this.isUserClass(receiverSymbol)) {
        return null;
      }
      return {
        typeSymbol: receiverSymbol,
        fileUri: receiverSymbol.fileUri,
        isStatic: true,
      };
    }

    const receiverType: TypeInfo | undefined =
      'type' in receiverSymbol &&
      typeof receiverSymbol.type === 'object' &&
      receiverSymbol.type !== null
        ? (receiverSymbol.type as TypeInfo)
        : undefined;
    if (!receiverType) {
      return null;
    }
    const resolvedTypeSymbol =
      inTypeSymbolGroup(
        receiverType.resolvedSymbol as ApexSymbol | undefined,
      ) && this.isUserClass(receiverType.resolvedSymbol)
        ? receiverType.resolvedSymbol
        : receiverType.resolvedType &&
            inTypeSymbolGroup(
              receiverType.resolvedType.resolvedSymbol as
                ApexSymbol | undefined,
            ) &&
            this.isUserClass(receiverType.resolvedType.resolvedSymbol)
          ? receiverType.resolvedType.resolvedSymbol
          : null;
    const typeIdentity =
      'originalTypeString' in receiverType &&
      typeof receiverType.originalTypeString === 'string'
        ? receiverType.originalTypeString
        : 'name' in receiverType && typeof receiverType.name === 'string'
          ? receiverType.name
          : receiver.declaredTypeName;
    const instanceType =
      resolvedTypeSymbol ??
      (typeIdentity ? await this.findUserClassByIdentity(typeIdentity) : null);
    if (!instanceType) {
      return null;
    }
    return {
      typeSymbol: instanceType,
      fileUri: instanceType.fileUri,
      isStatic: false,
    };
  }

  /**
   * Resolve a type name to a user-defined class symbol (not enum/interface, not
   * a standard-library type). Returns null otherwise.
   */
  private async findUserClassByIdentity(
    identity: string,
  ): Promise<TypeSymbol | null> {
    if (identity.includes('.')) {
      const byFqn = await this.symbolManager.findSymbolByFQN(identity);
      if (byFqn && inTypeSymbolGroup(byFqn) && this.isUserClass(byFqn)) {
        return byFqn;
      }
    }

    const candidates = (await this.symbolManager.findSymbolByName(identity))
      .filter((symbol): symbol is TypeSymbol => inTypeSymbolGroup(symbol))
      .filter((symbol) => this.isUserClass(symbol));
    const uniqueCandidates = [
      ...new Map(
        candidates.map((symbol) => {
          const range = symbol.location?.identifierRange;
          const declarationIdentity =
            symbol.fqn ??
            `${symbol.fileUri}:${range?.startLine ?? 0}:${range?.startColumn ?? 0}`;
          return [declarationIdentity.toLowerCase(), symbol] as const;
        }),
      ).values(),
    ];

    // A simple type name is usable only when it identifies exactly one user
    // class. Choosing the first global match silently targets the wrong file
    // in workspaces containing namespaces or duplicate nested type names.
    return uniqueCandidates.length === 1 ? uniqueCandidates[0] : null;
  }

  /** Find the innermost class lexically containing an implicit-this call. */
  private async findContainingType(
    fileUri: string,
    position: Position,
  ): Promise<TypeSymbol | null> {
    const symbols = await this.symbolManager.findSymbolsInFile(fileUri);
    const containing = symbols
      .filter((symbol): symbol is TypeSymbol => inTypeSymbolGroup(symbol))
      .filter((symbol) => this.isUserClass(symbol))
      .filter((symbol) => {
        const range = symbol.location?.symbolRange;
        if (!range) return false;
        const line = position.line + 1;
        return (
          (line > range.startLine ||
            (line === range.startLine &&
              position.character >= range.startColumn)) &&
          (line < range.endLine ||
            (line === range.endLine && position.character <= range.endColumn))
        );
      });

    return (
      containing.sort((left, right) => {
        const leftRange = left.location.symbolRange;
        const rightRange = right.location.symbolRange;
        const leftSpan =
          (leftRange.endLine - leftRange.startLine) * 1_000_000 +
          leftRange.endColumn -
          leftRange.startColumn;
        const rightSpan =
          (rightRange.endLine - rightRange.startLine) * 1_000_000 +
          rightRange.endColumn -
          rightRange.startColumn;
        return leftSpan - rightSpan;
      })[0] ?? null
    );
  }

  /** True iff the symbol is a user-defined class (not enum/interface, not stdlib). */
  private isUserClass(symbol: ApexSymbol): boolean {
    return (
      symbol.kind === SymbolKind.Class &&
      !symbol.modifiers?.isBuiltIn &&
      !symbol.fileUri?.startsWith('apexlib://')
    );
  }

  /**
   * Compose the method-stub source for the missing method.
   *
   * - return type: inferred from how the call result is used (declared local
   *   type or enclosing method return type); falls back to `Object`;
   * - parameters: types inferred from literal / `new` arguments (`Object`
   *   otherwise), with generated names `param1`, `param2`, ...;
   * - visibility: `public` (a cross-class call implies the member must be
   *   visible to the caller);
   * - `static` modifier: static iff the call is on the type name.
   */
  private buildMethodStub(
    callInfo: MethodCallAtRange,
    target: TargetClass,
  ): string {
    const returnType = callInfo.returnTypeText?.trim() || FALLBACK_TYPE;
    const params = callInfo.arguments
      .map(
        (arg, index) =>
          `${arg.inferredType || FALLBACK_TYPE} param${index + 1}`,
      )
      .join(', ');
    const staticModifier = target.isStatic ? 'static ' : '';
    const signature =
      `${SymbolVisibility.Public} ${staticModifier}` +
      `${returnType} ${callInfo.methodName}(${params})`;
    return `${signature} {\n    return null;\n  }`;
  }

  /**
   * Build the `WorkspaceEdit` that inserts the stub into the target type's
   * declaring file. Uses `documentChanges` (versioned edits) so the correct
   * file URI is targeted regardless of the current document (multi-file).
   *
   * The stub is inserted just before the type's closing brace; when the target
   * document is not loaded we fall back to the class symbol's end position.
   */
  private async buildDeclareMethodEdit(
    target: TargetClass,
    stub: string,
  ): Promise<WorkspaceEdit | null> {
    const insertPosition = await this.computeInsertPosition(target);
    if (!insertPosition) {
      return null;
    }

    const textEdit: TextEdit = {
      range: { start: insertPosition, end: insertPosition },
      newText: `  ${stub}\n`,
    };

    return {
      documentChanges: [
        {
          textDocument: { uri: target.fileUri, version: null },
          edits: [textEdit],
        },
      ],
    };
  }

  /**
   * Compute the insertion point: immediately before the target type's closing
   * brace, so the stub lands as the last member of the class.
   *
   * `symbolRange.endColumn` is computed as `stopToken.column + stopToken.length`
   * (see `ApexSymbolCollectorListener.getLocation`), i.e. it points *past* the
   * `}` rather than at it. Inserting there would emit the member *after* the
   * closing brace — outside the class body — producing invalid Apex. Subtract
   * the brace's own width (1 char) to land just before it.
   *
   * CAVEAT: this position comes from the *indexed* symbol (`symbolManager`),
   * not the live target file. For a multi-file Declare-Missing-Method fix the
   * target class is typically not the open document, so if that file has been
   * edited since it was last indexed the recorded `symbolRange` can be stale
   * and the stub may land at the wrong offset. Acceptable for the dev-only
   * steel thread; before production enablement (05.4) this should re-read the
   * target file (or reparse) to anchor the insertion against current content.
   */
  private async computeInsertPosition(
    target: TargetClass,
  ): Promise<{ line: number; character: number } | null> {
    const range = target.typeSymbol.location?.symbolRange;
    if (!range) {
      return null;
    }
    // LSP lines are 0-based; symbolRange lines are 1-based. endColumn is one
    // past the `}`, so endColumn - 1 is the brace's own column.
    const line = Math.max(0, range.endLine - 1);
    return { line, character: Math.max(0, range.endColumn - 1) };
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

    if (!context.selectedSymbol) {
      return actions;
    }

    try {
      // Preserve the exact selected symbol identity; same-name symbols may
      // have different reference/dependency graphs.
      const symbol = context.selectedSymbol;
      // Get references to this symbol to determine relationship statistics
      const referencesTo = await this.symbolManager.findReferencesTo(symbol);
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
        await this.symbolManager.analyzeDependencies(symbol);

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
    } catch (error) {
      this.logger.debug(() => `Error getting relationship actions: ${error}`);
    }

    return actions;
  }
}
