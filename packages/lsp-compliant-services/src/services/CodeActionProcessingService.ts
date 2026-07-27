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
import { ParserRuleContext } from 'antlr4';
import {
  ExpressionContext,
  PrimaryExpressionContext,
  LiteralPrimaryContext,
  PreOpExpressionContext,
  NegExpressionContext,
  ClassDeclarationContext,
} from '@apexdevtools/apex-parser';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  CompilerService,
  ApexFoldingRangeListener,
  findExpressionAtRange,
  ApexSymbol,
  TypeSymbol,
  SymbolKind,
  SymbolVisibility,
  findMethodCallAtRange,
  MethodCallAtRange,
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
  currentScope: string;
  isStatic: boolean;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
  /**
   * Cached CST for the document, used by the eager Extract Variable / Extract
   * Constant refactorings. `undefined` when the document could not be parsed.
   */
  parseTree?: ParserRuleContext;
}

/**
 * Service for processing code action requests using ApexSymbolManager
 */
export class CodeActionProcessingService implements ICodeActionProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly compilerService: CompilerService;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
    this.compilerService = new CompilerService();
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
    const parseTree = this.getParseTree(document);

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
      parseTree,
    };
  }

  /**
   * Parse the document into a CST for the eager extract refactorings.
   *
   * Uses {@link CompilerService} the same way sibling providers do (e.g. the
   * folding-range provider): compile with a lightweight listener purely to
   * obtain `CompilationResult.parseTree`. Returns `undefined` (never throws) on
   * parse failure so the extract actions simply degrade to "not offered".
   */
  private getParseTree(document: TextDocument): ParserRuleContext | undefined {
    try {
      const result = this.compilerService.compile(
        document.getText(),
        document.uri,
        new ApexFoldingRangeListener(),
        { includeComments: false },
      );
      return result.parseTree;
    } catch (error) {
      this.logger.debug(
        () => `Unable to parse document for extract actions: ${error}`,
      );
      return undefined;
    }
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
   * {@link findExpressionAtRange} finder (story 05.0). When the selection is not
   * a single, well-formed expression inside a method body the finder returns
   * `null` and neither action is offered. Extract Constant is additionally gated
   * to literal (or prefix-of-literal, e.g. `-5`) expressions.
   */
  private getExtractActions(context: CodeActionContext): CodeAction[] {
    const actions: CodeAction[] = [];

    if (!context.parseTree) {
      return actions;
    }

    let found;
    try {
      found = findExpressionAtRange(context.parseTree, context.range);
    } catch (error) {
      this.logger.debug(() => `Extract finder error: ${error}`);
      return actions;
    }

    if (!found) {
      return actions;
    }

    const { expression, statementStart, indent } = found;
    const text = context.document.getText();
    const exprStart = expression.start.start;
    const exprEnd = (expression.stop ?? expression.start).stop + 1;
    const exprText = text.substring(exprStart, exprEnd);
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
      start: context.document.positionAt(exprStart),
      end: context.document.positionAt(exprEnd),
    };

    const variableName = this.generateExtractName(text);

    const variableAction = this.buildExtractVariableAction(
      context,
      text,
      statementStart,
      indent,
      exprText,
      variableName,
      exprRange,
    );
    if (variableAction) {
      actions.push(variableAction);
    }

    if (this.isLiteralExpression(expression)) {
      const constantAction = this.buildExtractConstantAction(
        context,
        expression,
        exprText,
        variableName,
        exprRange,
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
   * Type inference is a separate story (01.1); until then the declared type
   * falls back to `Object` and a trailing comment documents the limitation.
   */
  private buildExtractVariableAction(
    context: CodeActionContext,
    text: string,
    statementStart: number,
    indent: string,
    exprText: string,
    variableName: string,
    exprRange: Range,
  ): CodeAction | null {
    const insertPosition = context.document.positionAt(statementStart);
    // Anchor the insertion at the very start of the statement's line so the new
    // declaration lands above the statement with matching indentation.
    const lineStart: Position = {
      line: insertPosition.line,
      character: 0,
    };

    const declaration = `${indent}Object ${variableName} = ${exprText}; // TODO: infer type (was Object)\n`;

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
   * Inserts `<modifiers> Object <name> = <exprText>;` at class-body level,
   * directly under the enclosing class declaration's opening brace, and replaces
   * the selection with `<name>`. Top-level classes use `private static final`;
   * inner classes use `private final` (Apex/Jorje disallows `static` on inner
   * members). Returns `null` when the enclosing class body cannot be located.
   */
  private buildExtractConstantAction(
    context: CodeActionContext,
    expression: ExpressionContext,
    exprText: string,
    variableName: string,
    exprRange: Range,
  ): CodeAction | null {
    const insertion = this.findConstantInsertion(expression);
    if (!insertion) {
      return null;
    }

    const modifiers = insertion.isInner
      ? 'private final'
      : 'private static final';
    const insertPosition = context.document.positionAt(insertion.offset);
    const declaration =
      `\n${insertion.indent}${modifiers} Object ${variableName} = ` +
      `${exprText}; // TODO: infer type (was Object)`;

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
   * Determine whether `expression` is a literal or a prefix-of-literal (a unary
   * `+`/`-`/`~`/`!` applied to a literal, e.g. `-5`). Only such expressions are
   * eligible for Extract Constant, matching Jorje's rule.
   */
  private isLiteralExpression(expression: ExpressionContext): boolean {
    // Bare literal: `primary -> literal`.
    if (
      expression instanceof PrimaryExpressionContext &&
      expression.primary() instanceof LiteralPrimaryContext
    ) {
      return true;
    }

    // Prefix-of-literal: unary operator applied to a (possibly nested) literal,
    // e.g. `-5`, `+3`, `!true`, `~0`.
    if (
      expression instanceof PreOpExpressionContext ||
      expression instanceof NegExpressionContext
    ) {
      const inner = expression.expression();
      return inner ? this.isLiteralExpression(inner) : false;
    }

    return false;
  }

  /**
   * Locate the class-body insertion point for an extracted constant.
   *
   * Walks the CST parents of `expression` to the nearest enclosing
   * {@link ClassDeclarationContext}, then returns the character offset just
   * after that class body's opening `{`, the indentation to use for the new
   * member, and whether the class is an inner class (nested inside another
   * class declaration). Returns `null` when no enclosing class is found or its
   * body brace is unavailable.
   */
  private findConstantInsertion(
    expression: ExpressionContext,
  ): { offset: number; indent: string; isInner: boolean } | null {
    let current: ParserRuleContext | undefined = expression.parentCtx;
    let classDecl: ClassDeclarationContext | undefined;
    while (current) {
      if (current instanceof ClassDeclarationContext) {
        classDecl = current;
        break;
      }
      current = current.parentCtx;
    }

    if (!classDecl) {
      return null;
    }

    const classBody = classDecl.classBody();
    const openBrace = classBody?.LBRACE();
    if (!classBody || !openBrace) {
      return null;
    }

    // Insert immediately after the class body's opening brace.
    const offset = openBrace.symbol.stop + 1;

    // An inner class has another class declaration among its ancestors.
    let ancestor: ParserRuleContext | undefined = classDecl.parentCtx;
    let isInner = false;
    while (ancestor) {
      if (ancestor instanceof ClassDeclarationContext) {
        isInner = true;
        break;
      }
      ancestor = ancestor.parentCtx;
    }

    // Indent inner-class members one extra level relative to the class keyword.
    const classIndent = ' '.repeat(Math.max(0, classDecl.start.column));
    const indent = `${classIndent}  `;

    return { offset, indent, isInner };
  }

  /**
   * Generate an extracted-symbol name (`v1`, `v2`, …) that does not collide with
   * an identifier already present in the document. This is a pragmatic,
   * text-based collision check; precise scope analysis is out of scope here.
   */
  private generateExtractName(text: string): string {
    for (let index = 1; index < 1000; index++) {
      const candidate = `v${index}`;
      const wordBoundary = new RegExp(`\\b${candidate}\\b`);
      if (!wordBoundary.test(text)) {
        return candidate;
      }
    }
    return `v${Date.now()}`;
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

    if (!context.symbolName) {
      return actions;
    }

    try {
      // Find symbol in ApexSymbolManager
      const symbols = await this.symbolManager.findSymbolByName(
        context.symbolName,
      );

      for (const symbol of symbols) {
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
    // recompiling the document. findMethodCallAtRange only walks the parse
    // tree, which is grammar-equivalent regardless of the listener used to
    // build it, so the shared context.parseTree is sufficient.
    const parseTree = context.parseTree;
    if (!parseTree) {
      return null;
    }

    // Prefer the code-action request range, then each diagnostic range.
    const ranges: Range[] = [context.range, ...diagnostics.map((d) => d.range)];
    for (const range of ranges) {
      const call = findMethodCallAtRange(parseTree, range);
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
   * - Qualified call `receiver.method(...)`: the receiver text (a variable,
   *   field, or the type name itself) is resolved to a type via the symbol
   *   manager. `static` iff the receiver text *is* the type name.
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
    if (callInfo.receiverText) {
      return this.resolveReceiverType(context, callInfo.receiverText);
    }

    // Unqualified call -> enclosing (current) class; instance call.
    const currentType = await this.findTypeInFile(context.document.uri);
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
   * Resolve a receiver expression (e.g. `acct`, `MyClass`) to the user class it
   * refers to. The receiver may be the type name (static call) or a variable /
   * field whose declared type is the target (instance call).
   */
  private async resolveReceiverType(
    context: CodeActionContext,
    receiverText: string,
  ): Promise<TargetClass | null> {
    // 1) Receiver is itself a type name -> static call on that type.
    const directType = await this.findUserClassByName(receiverText);
    if (directType) {
      return {
        typeSymbol: directType,
        fileUri: directType.fileUri,
        isStatic: true,
      };
    }

    // 2) Receiver is a variable / field -> resolve its declared type name,
    //    then look that type up. Instance call.
    const typeName = await this.findReceiverDeclaredTypeName(
      context.document.uri,
      receiverText,
    );
    if (!typeName) {
      return null;
    }
    const instanceType = await this.findUserClassByName(typeName);
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
   * Find the declared type name of a variable/field named `receiverText` in the
   * given file (the receiver of an instance call).
   */
  private async findReceiverDeclaredTypeName(
    fileUri: string,
    receiverText: string,
  ): Promise<string | undefined> {
    const symbols = await this.symbolManager.findSymbolsInFile(fileUri);
    const variable = symbols.find(
      (s) =>
        s.name === receiverText &&
        (s.kind === SymbolKind.Variable ||
          s.kind === SymbolKind.Field ||
          s.kind === SymbolKind.Property ||
          s.kind === SymbolKind.Parameter),
    );
    if (variable && 'type' in variable) {
      const typeInfo = (variable as { type?: { name?: string } }).type;
      return typeInfo?.name;
    }
    return undefined;
  }

  /**
   * Resolve a type name to a user-defined class symbol (not enum/interface, not
   * a standard-library type). Returns null otherwise.
   */
  private async findUserClassByName(name: string): Promise<TypeSymbol | null> {
    const candidates = await this.symbolManager.findSymbolByName(name);
    const typeSymbol = candidates.find(
      (s) => inTypeSymbolGroup(s) && this.isUserClass(s),
    );
    return typeSymbol && inTypeSymbolGroup(typeSymbol) ? typeSymbol : null;
  }

  /** Find the top-level type declared in a file (used for implicit-`this` calls). */
  private async findTypeInFile(fileUri: string): Promise<TypeSymbol | null> {
    const symbols = await this.symbolManager.findSymbolsInFile(fileUri);
    const typeSymbol = symbols.find(
      (s) => inTypeSymbolGroup(s) && this.isUserClass(s),
    );
    return typeSymbol && inTypeSymbolGroup(typeSymbol) ? typeSymbol : null;
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

    if (!context.symbolName) {
      return actions;
    }

    try {
      // Find symbol in ApexSymbolManager
      const symbols = await this.symbolManager.findSymbolByName(
        context.symbolName,
      );

      for (const symbol of symbols) {
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
