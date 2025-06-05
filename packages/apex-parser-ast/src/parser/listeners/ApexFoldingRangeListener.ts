/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  BlockContext,
  ClassDeclarationContext,
  ConstructorDeclarationContext,
  EnumDeclarationContext,
  IfStatementContext,
  InterfaceDeclarationContext,
  InterfaceMethodDeclarationContext,
  MethodDeclarationContext,
  SwitchStatementContext,
  TryStatementContext,
  WhileStatementContext,
  ForStatementContext,
  DoWhileStatementContext,
  TriggerUnitContext,
} from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { BaseApexParserListener } from './BaseApexParserListener';

/**
 * Types of foldable regions in Apex code
 */
export enum FoldingRangeKind {
  Class = 'class',
  Interface = 'interface',
  Method = 'method',
  Constructor = 'constructor',
  Block = 'block',
  IfStatement = 'if',
  TryCatch = 'try',
  Switch = 'switch',
  While = 'while',
  For = 'for',
  DoWhile = 'do',
  Enum = 'enum',
  Trigger = 'trigger',
  Comment = 'comment',
  Statement = 'statement', // For multiline statements like SOQL
}

/**
 * Represents a foldable region in the code
 */
export interface FoldingRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  kind: FoldingRangeKind;
  level: number;
}

/**
 * Listener that collects folding ranges from Apex code.
 * This listener tracks various code blocks and statements that can be folded
 * in the editor.
 */
export class ApexFoldingRangeListener extends BaseApexParserListener<
  FoldingRange[]
> {
  private readonly logger = getLogger();
  private ranges: FoldingRange[] = [];
  private blockDepth: number = 0;

  /**
   * Get all collected folding ranges
   */
  getResult(): FoldingRange[] {
    return this.ranges;
  }

  /**
   * Create a new instance of this listener for processing multiple files
   */
  createNewInstance(): BaseApexParserListener<FoldingRange[]> {
    return new ApexFoldingRangeListener();
  }

  /**
   * Called when entering a class declaration
   */
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    this.addRange(ctx, FoldingRangeKind.Class);
  }

  /**
   * Called when entering an interface declaration
   */
  enterInterfaceDeclaration(ctx: InterfaceDeclarationContext): void {
    this.addRange(ctx, FoldingRangeKind.Interface);
  }

  /**
   * Called when entering a method declaration
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    this.addRange(ctx, FoldingRangeKind.Method);
  }

  /**
   * Called when entering a constructor declaration
   */
  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    this.addRange(ctx, FoldingRangeKind.Constructor);
  }

  /**
   * Called when entering an interface method declaration
   */
  enterInterfaceMethodDeclaration(
    ctx: InterfaceMethodDeclarationContext,
  ): void {
    this.addRange(ctx, FoldingRangeKind.Method);
  }

  /**
   * Called when entering an enum declaration
   */
  enterEnumDeclaration(ctx: EnumDeclarationContext): void {
    this.addRange(ctx, FoldingRangeKind.Enum);
  }

  /**
   * Called when entering a trigger unit
   */
  enterTriggerUnit(ctx: TriggerUnitContext): void {
    this.addRange(ctx, FoldingRangeKind.Trigger);
  }

  /**
   * Called when entering a block
   */
  enterBlock(ctx: BlockContext): void {
    this.blockDepth++;
    this.addRange(ctx, FoldingRangeKind.Block);
  }

  /**
   * Called when exiting a block
   */
  exitBlock(): void {
    this.blockDepth--;
  }

  /**
   * Called when entering an if statement
   */
  enterIfStatement(ctx: IfStatementContext): void {
    this.addRange(ctx, FoldingRangeKind.IfStatement);
  }

  /**
   * Called when entering a try statement
   */
  enterTryStatement(ctx: TryStatementContext): void {
    this.addRange(ctx, FoldingRangeKind.TryCatch);
  }

  /**
   * Called when entering a switch statement
   */
  enterSwitchStatement(ctx: SwitchStatementContext): void {
    this.addRange(ctx, FoldingRangeKind.Switch);
  }

  /**
   * Called when entering a while statement
   */
  enterWhileStatement(ctx: WhileStatementContext): void {
    this.addRange(ctx, FoldingRangeKind.While);
  }

  /**
   * Called when entering a for statement
   */
  enterForStatement(ctx: ForStatementContext): void {
    this.addRange(ctx, FoldingRangeKind.For);
  }

  /**
   * Called when entering a do-while statement
   */
  enterDoWhileStatement(ctx: DoWhileStatementContext): void {
    this.addRange(ctx, FoldingRangeKind.DoWhile);
  }

  /**
   * Called when entering a statement
   * This will capture multiline statements like SOQL queries
   */
  enterStatement(ctx: ParserRuleContext): void {
    // Only add folding range if the statement spans multiple lines
    if (ctx.start.line !== ctx.stop?.line) {
      this.addRange(ctx, FoldingRangeKind.Statement);
    }
  }

  /**
   * Add a folding range for a parser context
   */
  private addRange(ctx: ParserRuleContext, kind: FoldingRangeKind): void {
    try {
      const range: FoldingRange = {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: ctx.stop?.line ?? ctx.start.line,
        endColumn:
          (ctx.stop?.charPositionInLine ?? ctx.start.charPositionInLine) +
          (ctx.stop?.text?.length ?? 0),
        kind,
        level: this.blockDepth,
      };

      this.ranges.push(range);
      this.logger.debug(
        `Added folding range for ${kind} at lines ${range.startLine}-${range.endLine}`,
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(`Error adding folding range: ${errorMessage}`);
    }
  }
}
