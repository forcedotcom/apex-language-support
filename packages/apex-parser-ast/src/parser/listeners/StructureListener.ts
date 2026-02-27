/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ClassDeclarationContext,
  InterfaceDeclarationContext,
  EnumDeclarationContext,
  MethodDeclarationContext,
  ConstructorDeclarationContext,
  InterfaceMethodDeclarationContext,
  BlockContext,
  TriggerUnitContext,
  TriggerMemberDeclarationContext,
  IfStatementContext,
  WhileStatementContext,
  ForStatementContext,
  DoWhileStatementContext,
  TryStatementContext,
  CatchClauseContext,
  FinallyBlockContext,
  SwitchStatementContext,
  WhenControlContext,
  RunAsStatementContext,
  GetterContext,
  SetterContext,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { Stack } from 'data-structure-typed';

import { BaseApexParserListener } from './BaseApexParserListener';
import {
  SymbolTable,
  SymbolLocation,
  SymbolKind,
  SymbolModifiers,
  SymbolVisibility,
  ScopeSymbol,
  ScopeType,
  SymbolKey,
  SymbolFactory,
} from '../../types/symbol';
import { isBlockSymbol } from '../../utils/symbolNarrowing';
import { extractFilePathFromUri } from '../../types/UriBasedIdGenerator';

/**
 * Lightweight listener that establishes the complete block hierarchy in a single pass.
 * Runs first in every compilation path so all subsequent listeners can find and reuse
 * blocks instead of creating their own. Uses location-based block IDs for determinism.
 */
export class StructureListener extends BaseApexParserListener<SymbolTable> {
  private symbolTable: SymbolTable;
  private currentFilePath: string = '';
  private scopeStack: Stack<ScopeSymbol> = new Stack();

  constructor(symbolTable: SymbolTable) {
    super();
    this.symbolTable = symbolTable;
  }

  setCurrentFileUri(fileUri: string): void {
    this.currentFilePath = fileUri;
    this.symbolTable.setFileUri(fileUri);
  }

  getResult(): SymbolTable {
    return this.symbolTable;
  }

  private getLocation(ctx: ParserRuleContext): SymbolLocation {
    const start = ctx.start;
    const stop = ctx.stop || start;

    return {
      symbolRange: {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + (stop.text?.length || 0),
      },
      identifierRange: {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + (stop.text?.length || 0),
      },
    };
  }

  /**
   * Generate deterministic block ID: fileUri:block:scopeType:line:column
   */
  private generateBlockId(
    scopeType: ScopeType,
    location: SymbolLocation,
  ): string {
    const fileUri = this.symbolTable.getFileUri() || this.currentFilePath;
    const normalized = extractFilePathFromUri(fileUri);
    const { startLine, startColumn } = location.symbolRange;
    return `${normalized}:block:${scopeType}:${startLine}:${startColumn}`;
  }

  private getCurrentScopeSymbol(): ScopeSymbol | null {
    const peeked = this.scopeStack.peek();
    return isBlockSymbol(peeked) ? peeked : null;
  }

  private createBlockSymbol(
    name: string,
    scopeType: ScopeType,
    location: SymbolLocation,
    parentScope: ScopeSymbol | null,
  ): ScopeSymbol {
    const fileUri = this.symbolTable.getFileUri() || this.currentFilePath;
    const normalizedUri = extractFilePathFromUri(fileUri);
    const parentId = parentScope?.id ?? null;

    const id = this.generateBlockId(scopeType, location);
    const scopePath = parentScope
      ? [normalizedUri, 'block', parentScope.name, name]
      : [normalizedUri, name];

    const key: SymbolKey = {
      prefix: scopeType,
      name,
      path: scopePath,
      unifiedId: id,
      fileUri: normalizedUri,
      kind: SymbolKind.Block,
    };

    const modifiers: SymbolModifiers = {
      visibility: SymbolVisibility.Default,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
      isBuiltIn: false,
    };

    const blockLocation: SymbolLocation = {
      symbolRange: location.symbolRange,
      identifierRange: location.symbolRange,
    };

    const blockSymbol = SymbolFactory.createScopeSymbolByType(
      name,
      scopeType,
      blockLocation,
      normalizedUri,
      parentId,
      key,
      modifiers,
    );

    this.symbolTable.addSymbol(blockSymbol, parentScope);
    return blockSymbol;
  }

  private enterScope(
    scopeType: ScopeType,
    ctx: ParserRuleContext,
    semanticName?: string,
  ): void {
    const location = this.getLocation(ctx);
    const parentScope = this.getCurrentScopeSymbol();
    const name =
      semanticName ??
      `block_${location.symbolRange.startLine}_${location.symbolRange.startColumn}`;

    const blockSymbol = this.createBlockSymbol(
      name,
      scopeType,
      location,
      parentScope,
    );
    this.scopeStack.push(blockSymbol);
  }

  private exitScope(expectedScopeType: ScopeType): void {
    const popped = this.scopeStack.pop();
    if (isBlockSymbol(popped) && popped.scopeType !== expectedScopeType) {
      // Log but don't throw - structure may still be valid
    }
  }

  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    const name = ctx.id()?.text ?? 'unknownClass';
    this.enterScope('class', ctx, name);
  }

  exitClassDeclaration(): void {
    this.exitScope('class');
  }

  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    const name = ctx.id()?.text ?? 'unknownInterface';
    this.enterScope('class', ctx, name);
  }

  exitInterfaceDeclaration(): void {
    this.exitScope('class');
  }

  enterEnumDeclaration(ctx: EnumDeclarationContext): void {
    const name = ctx.id()?.text ?? 'unknownEnum';
    this.enterScope('class', ctx, name);
  }

  exitEnumDeclaration(): void {
    this.exitScope('class');
  }

  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    const name = ctx.id()?.text ?? 'unknownMethod';
    this.enterScope('method', ctx, name);
  }

  exitMethodDeclaration(): void {
    this.exitScope('method');
  }

  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    const qualifiedName = ctx.qualifiedName();
    const ids = qualifiedName?.id();
    const name = ids && ids.length > 0 ? ids[0].text : 'unknownConstructor';
    this.enterScope('method', ctx, name);
  }

  exitConstructorDeclaration(): void {
    this.exitScope('method');
  }

  enterInterfaceMethodDeclaration(
    ctx: InterfaceMethodDeclarationContext,
  ): void {
    const name = ctx.id()?.text ?? 'unknownMethod';
    this.enterScope('method', ctx, name);
  }

  exitInterfaceMethodDeclaration(): void {
    this.exitScope('method');
  }

  enterBlock(ctx: BlockContext): void {
    const parentScope = this.getCurrentScopeSymbol();
    // Skip only when this block is the method body (direct child of method/constructor declaration)
    const parentCtx = ctx.parent;
    const isMethodBodyBlock =
      parentScope?.scopeType === 'method' &&
      parentCtx &&
      (parentCtx.constructor.name === 'MethodDeclarationContext' ||
        parentCtx.constructor.name === 'ConstructorDeclarationContext' ||
        parentCtx.constructor.name === 'InterfaceMethodDeclarationContext');
    if (isMethodBodyBlock) {
      return;
    }
    this.enterScope('block', ctx);
  }

  exitBlock(): void {
    const currentScope = this.getCurrentScopeSymbol();
    if (currentScope?.scopeType === 'method') {
      return; // Exiting method body, we didn't push a generic block
    }
    this.exitScope('block');
  }

  enterIfStatement(ctx: IfStatementContext): void {
    this.enterScope('if', ctx);
  }

  exitIfStatement(): void {
    this.exitScope('if');
  }

  enterWhileStatement(ctx: WhileStatementContext): void {
    this.enterScope('while', ctx);
  }

  exitWhileStatement(): void {
    this.exitScope('while');
  }

  enterForStatement(ctx: ForStatementContext): void {
    this.enterScope('for', ctx);
  }

  exitForStatement(): void {
    this.exitScope('for');
  }

  enterDoWhileStatement(ctx: DoWhileStatementContext): void {
    this.enterScope('doWhile', ctx);
  }

  exitDoWhileStatement(): void {
    this.exitScope('doWhile');
  }

  enterTryStatement(ctx: TryStatementContext): void {
    this.enterScope('try', ctx);
  }

  exitTryStatement(): void {
    this.exitScope('try');
  }

  enterCatchClause(ctx: CatchClauseContext): void {
    this.enterScope('catch', ctx);
  }

  exitCatchClause(): void {
    this.exitScope('catch');
  }

  enterFinallyBlock(ctx: FinallyBlockContext): void {
    this.enterScope('finally', ctx);
  }

  exitFinallyBlock(): void {
    this.exitScope('finally');
  }

  enterSwitchStatement(ctx: SwitchStatementContext): void {
    this.enterScope('switch', ctx);
  }

  exitSwitchStatement(): void {
    this.exitScope('switch');
  }

  enterWhenControl(ctx: WhenControlContext): void {
    this.enterScope('when', ctx);
  }

  exitWhenControl(): void {
    this.exitScope('when');
  }

  enterRunAsStatement(ctx: RunAsStatementContext): void {
    this.enterScope('runAs', ctx);
  }

  exitRunAsStatement(): void {
    this.exitScope('runAs');
  }

  enterGetterContext(ctx: GetterContext): void {
    this.enterScope('getter', ctx);
  }

  exitGetterContext(): void {
    this.exitScope('getter');
  }

  enterSetterContext(ctx: SetterContext): void {
    this.enterScope('setter', ctx);
  }

  exitSetterContext(): void {
    this.exitScope('setter');
  }

  enterTriggerUnit(ctx: TriggerUnitContext): void {
    const name = ctx.id(0)?.text ?? 'unknownTrigger';
    this.enterScope('class', ctx, name);
  }

  exitTriggerUnit(): void {
    this.exitScope('class');
  }

  enterTriggerMemberDeclaration(ctx: TriggerMemberDeclarationContext): void {
    // TriggerMemberDeclaration -> TriggerBlockMember -> TriggerBlock -> TriggerUnit
    const triggerUnit = ctx.parent?.parent?.parent as TriggerUnitContext;
    const name = triggerUnit?.id?.(0)?.text ?? 'unknownTrigger';
    this.enterScope('class', ctx, name);
  }

  exitTriggerMemberDeclaration(): void {
    this.exitScope('class');
  }
}
