/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  BreakStatementContext,
  ContinueStatementContext,
  DeleteStatementContext,
  DoWhileStatementContext,
  ExpressionStatementContext,
  ForStatementContext,
  IfStatementContext,
  InsertStatementContext,
  LocalVariableDeclarationStatementContext,
  MergeStatementContext,
  ReturnStatementContext,
  RunAsStatementContext,
  SwitchStatementContext,
  ThrowStatementContext,
  UndeleteStatementContext,
  UpdateStatementContext,
  UpsertStatementContext,
  WhenControlContext,
  WhileStatementContext,
} from '@apexdevtools/apex-parser';
import type { ParserRuleContext } from 'antlr4';

import { BaseApexParserListener } from './BaseApexParserListener';

/**
 * Collects executable Apex source lines that may host a debugger breakpoint.
 *
 * This deliberately follows the parser grammar rather than interpreting
 * document text. The selected grammar nodes mirror the legacy Jorje debugger
 * visitor: control-flow headers stand in for their condition nodes, while
 * structural blocks, try/catch containers, and bare blocks do not contribute.
 */
export class ApexBreakpointListener extends BaseApexParserListener<
  readonly number[]
> {
  private readonly lines = new Set<number>();

  enterIfStatement(ctx: IfStatementContext): void {
    this.add(ctx);
  }

  enterWhileStatement(ctx: WhileStatementContext): void {
    this.add(ctx);
  }

  enterForStatement(ctx: ForStatementContext): void {
    this.add(ctx);
  }

  enterDoWhileStatement(ctx: DoWhileStatementContext): void {
    this.add(ctx);
  }

  enterSwitchStatement(ctx: SwitchStatementContext): void {
    this.add(ctx);
  }

  enterWhenControl(ctx: WhenControlContext): void {
    this.add(ctx);
  }

  enterBreakStatement(ctx: BreakStatementContext): void {
    this.add(ctx);
  }

  enterContinueStatement(ctx: ContinueStatementContext): void {
    this.add(ctx);
  }

  enterDeleteStatement(ctx: DeleteStatementContext): void {
    this.add(ctx);
  }

  enterExpressionStatement(ctx: ExpressionStatementContext): void {
    this.add(ctx);
  }

  enterInsertStatement(ctx: InsertStatementContext): void {
    this.add(ctx);
  }

  enterLocalVariableDeclarationStatement(
    ctx: LocalVariableDeclarationStatementContext,
  ): void {
    this.add(ctx);
  }

  enterMergeStatement(ctx: MergeStatementContext): void {
    this.add(ctx);
  }

  enterReturnStatement(ctx: ReturnStatementContext): void {
    this.add(ctx);
  }

  enterRunAsStatement(ctx: RunAsStatementContext): void {
    this.add(ctx);
  }

  enterThrowStatement(ctx: ThrowStatementContext): void {
    this.add(ctx);
  }

  enterUndeleteStatement(ctx: UndeleteStatementContext): void {
    this.add(ctx);
  }

  enterUpdateStatement(ctx: UpdateStatementContext): void {
    this.add(ctx);
  }

  enterUpsertStatement(ctx: UpsertStatementContext): void {
    this.add(ctx);
  }

  getResult(): readonly number[] {
    return [...this.lines].sort((left, right) => left - right);
  }

  private add(ctx: ParserRuleContext): void {
    this.lines.add(ctx.start.line);
  }
}
