/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ClassDeclarationContext,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  TypeSymbol,
  ApexSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import { isBlockSymbol } from '../../../utils/symbolNarrowing';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';

interface ClassWithStaticBlock {
  line: number;
  isInner: boolean;
  innerDepth: number;
}

/**
 * Listener to find class declarations and static blocks for inner type validation
 */
class StaticBlockListener extends BaseApexParserListener<void> {
  private classStack: Array<{ line: number; isInner: boolean }> = [];
  private classesWithStaticBlocks: ClassWithStaticBlock[] = [];

  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    const isInner = this.classStack.length > 0;
    this.classStack.push({
      line: ctx.start.line,
      isInner,
    });
  }

  exitClassDeclaration(): void {
    this.classStack.pop();
  }

  enterBlock(ctx: any): void {
    if (ctx.parent && this.isStaticBlock(ctx) && this.classStack.length > 0) {
      const currentClass = this.classStack[this.classStack.length - 1];
      if (currentClass.isInner) {
        this.classesWithStaticBlocks.push({
          line: currentClass.line,
          isInner: true,
          innerDepth: this.classStack.length,
        });
      }
    }
  }

  private isStaticBlock(ctx: any): boolean {
    const parent = ctx.parent;
    if (!parent) return false;
    const children = parent.children ?? [];
    const idx = children.indexOf(ctx);
    if (idx <= 0) return false;
    const prev = children[idx - 1];
    const text = prev?.text?.toLowerCase().trim();
    return text === 'static';
  }

  getClassesWithStaticBlocks(): ClassWithStaticBlock[] {
    return this.classesWithStaticBlocks;
  }

  getResult(): void {
    return undefined as void;
  }
}

/**
 * Validates inner type rules:
 * - INVALID_INNER_TYPE_NO_INNER_TYPES: Inner types cannot have inner types
 * - INVALID_INNER_TYPE_NO_STATIC_BLOCKS: Inner types cannot have static blocks
 */
export const InnerTypeValidator: Validator = {
  id: 'inner-type',
  name: 'Inner Type Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 8,
  prerequisites: {
    requiredDetailLevel: 'full',
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      const allSymbols = symbolTable.getAllSymbols();

      const typeSymbols = allSymbols.filter(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol[];

      for (const typeSymbol of typeSymbols) {
        if (!typeSymbol.parentId) continue;

        const parent = allSymbols.find((s) => s.id === typeSymbol.parentId) as
          | ApexSymbol
          | undefined;

        if (!parent) continue;

        const parentIsType =
          parent.kind === SymbolKind.Class ||
          parent.kind === SymbolKind.Interface;
        const parentIsInner =
          parentIsType && (parent as TypeSymbol).parentId != null;

        const typeBlock = allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            (s as ScopeSymbol).scopeType === 'class' &&
            s.parentId === typeSymbol.id,
        );
        const hasInnerTypes = allSymbols.some(
          (s) =>
            (s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface) &&
            s.id !== typeSymbol.id &&
            (s.parentId === typeSymbol.id || s.parentId === typeBlock?.id),
        );

        if (parentIsInner || hasInnerTypes) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_INNER_TYPE_NO_INNER_TYPES,
            ),
            location: typeSymbol.location,
            code: ErrorCodes.INVALID_INNER_TYPE_NO_INNER_TYPES,
          });
        }
      }

      if (options.sourceContent) {
        const fileUri = symbolTable.getFileUri() || 'unknown.cls';
        const isTrigger = fileUri.endsWith('.trigger');
        const isAnonymous = fileUri.endsWith('.apex');
        const contentToParse = isAnonymous
          ? `{${options.sourceContent}}`
          : options.sourceContent;

        try {
          const inputStream = CharStreams.fromString(contentToParse);
          const lexer = new ApexLexer(
            new CaseInsensitiveInputStream(inputStream),
          );
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);

          let parseTree:
            | CompilationUnitContext
            | TriggerUnitContext
            | BlockContext;
          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }

          const listener = new StaticBlockListener();
          const walker = new ParseTreeWalker();
          walker.walk(listener, parseTree);

          for (const cls of listener.getClassesWithStaticBlocks()) {
            const typeAtLine = typeSymbols.find((t) => {
              const start =
                t.location?.identifierRange?.startLine ??
                t.location?.symbolRange.startLine;
              return t.parentId && cls.line === start;
            });
            if (typeAtLine) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_INNER_TYPE_NO_STATIC_BLOCKS,
                ),
                location: typeAtLine.location,
                code: ErrorCodes.INVALID_INNER_TYPE_NO_STATIC_BLOCKS,
              });
            }
          }
        } catch {
          // Parse failed - skip static block check
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
