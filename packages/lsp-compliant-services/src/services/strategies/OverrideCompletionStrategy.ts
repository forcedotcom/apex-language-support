/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbol,
  ISymbolManager,
  MethodSymbol,
  SymbolKind,
  TypeSymbol,
  inTypeSymbolGroup,
  isMethodSymbol as isMethodSymbolNarrowing,
} from '@salesforce/apex-lsp-parser-ast';
import { CompletionContext } from '../CompletionProcessingService';
import { CompletionStrategy, CompletionCandidate } from './CompletionStrategy';

/**
 * Pattern matching the line text immediately before the cursor when the user
 * is in the middle of writing an override declaration, mirroring Jorje's
 * `MethodNamesCompletionStrategy.isVirtualMethodOverride` regex:
 *   `^\s*([a-z]+)\s+override\s*$`
 * The leading `[a-z]+` captures the method visibility (public/private/...).
 */
const OVERRIDE_LINE_PATTERN = /^\s*([a-z]+)\s+override\s*$/;

/**
 * Strategy that suggests overrideable methods inherited from a superclass when
 * the user has typed a visibility followed by `override` (e.g. `public override `).
 * The completion item's insert text is a snippet containing the full method
 * signature with a body placeholder, so accepting it scaffolds the override.
 */
export class OverrideCompletionStrategy implements CompletionStrategy {
  readonly name = 'OverrideCompletion';

  constructor(
    private readonly logger: LoggerInterface,
    private readonly symbolManager: ISymbolManager,
  ) {}

  canHandle(context: CompletionContext): boolean {
    const lineText = context.document.getText({
      start: { line: context.position.line, character: 0 },
      end: context.position,
    });
    return OVERRIDE_LINE_PATTERN.test(lineText);
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: CompletionCandidate[] = [];

      const containingClass = yield* Effect.promise(() =>
        self.findContainingClass(context.document.uri, context.position),
      );
      if (!containingClass || !containingClass.superClass) {
        return candidates;
      }

      const superType = yield* Effect.promise(() =>
        self.resolveTypeByName(containingClass.superClass!),
      );
      if (!superType) {
        return candidates;
      }

      const methods = yield* Effect.promise(() =>
        self.collectOverridableMethods(superType),
      );

      const seen = new Set<string>();
      for (const method of methods) {
        const sig = self.methodSignature(method);
        if (seen.has(sig)) continue;
        seen.add(sig);
        candidates.push({
          symbol: self.makeOverrideSymbol(method),
          relevance: 0.95,
          context: `override candidate from ${superType.name}`,
        });
      }

      return candidates;
    });
  }

  /**
   * Walk the superclass chain (depth-bounded) and collect virtual or abstract
   * non-final, non-static methods that the current class can override.
   */
  private async collectOverridableMethods(
    startType: TypeSymbol,
  ): Promise<MethodSymbol[]> {
    const result: MethodSymbol[] = [];
    // Track visited type ids to prevent infinite loops on cyclic chains.
    const visited = new Set<string>();
    let current: TypeSymbol | null = startType;
    let depth = 0;

    while (current && depth < 10) {
      if (visited.has(current.id)) break;
      visited.add(current.id);

      const members = await this.getDirectMembers(current);
      for (const member of members) {
        if (
          member.kind === SymbolKind.Method &&
          isMethodSymbolNarrowing(member) &&
          this.isOverridableMethod(member)
        ) {
          result.push(member);
        }
      }
      if (!current.superClass) break;
      current = await this.resolveTypeByName(current.superClass);
      depth++;
    }
    return result;
  }

  private isOverridableMethod(method: MethodSymbol): boolean {
    const mods = method.modifiers;
    if (!mods) return false;
    if (mods.isStatic) return false;
    if (mods.isFinal) return false;
    return Boolean(mods.isVirtual || mods.isAbstract);
  }

  private async getDirectMembers(
    typeSymbol: TypeSymbol,
  ): Promise<ApexSymbol[]> {
    if (!typeSymbol.fileUri) return [];
    const symbolTable = await this.symbolManager.getSymbolTableForFile(
      typeSymbol.fileUri,
    );
    if (!symbolTable) {
      return await this.symbolManager.findSymbolsInFile(typeSymbol.fileUri);
    }
    return symbolTable
      .getAllSymbols()
      .filter((s: ApexSymbol) => s.kind === SymbolKind.Method);
  }

  private async resolveTypeByName(name: string): Promise<TypeSymbol | null> {
    const baseName = name.replace(/<.*>/, '').replace(/\[\]$/, '');
    const symbols = await this.symbolManager.findSymbolByName(baseName);
    const typeSymbol = symbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum,
    );
    if (typeSymbol && inTypeSymbolGroup(typeSymbol)) {
      return typeSymbol;
    }
    return null;
  }

  /**
   * Find the smallest (innermost) class symbol whose range contains `position`.
   */
  private async findContainingClass(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<TypeSymbol | null> {
    const symbolTable = await this.symbolManager.getSymbolTableForFile(fileUri);
    const allSymbols = symbolTable
      ? symbolTable.getAllSymbols()
      : await this.symbolManager.findSymbolsInFile(fileUri);

    const candidates = allSymbols.filter((s: ApexSymbol) => {
      if (s.kind !== SymbolKind.Class) return false;
      const range = s.location?.symbolRange;
      if (!range) return false;
      return range.startLine <= position.line && range.endLine >= position.line;
    });

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      const aSize =
        a.location.symbolRange.endLine - a.location.symbolRange.startLine;
      const bSize =
        b.location.symbolRange.endLine - b.location.symbolRange.startLine;
      return aSize - bSize;
    });
    const containing = candidates[0];
    return inTypeSymbolGroup(containing) ? (containing as TypeSymbol) : null;
  }

  /**
   * Build a synthetic method-like symbol whose `insertText` is a snippet with
   * the full overriding signature plus an empty body placeholder, e.g.
   *   `String getName(Integer id) {${0}}`
   */
  private makeOverrideSymbol(method: MethodSymbol): any {
    const params = method.parameters ?? [];
    const paramText = params
      .map((p, idx) => {
        const typeName = p?.type?.name ?? 'Object';
        const name = p?.name ?? `param${idx + 1}`;
        return `${typeName} ${name}`;
      })
      .join(', ');
    const returnType = method.returnType?.name ?? 'void';
    const insertText = `${returnType} ${method.name}(${paramText}) {\${0}}`;

    return {
      id: `override:${method.id}`,
      name: method.name,
      kind: 'method',
      parameters: params,
      returnType: method.returnType,
      modifiers: method.modifiers,
      insertText,
      isSnippet: true,
      location: method.location,
    };
  }

  /**
   * Compact signature for deduplication: name + parameter types.
   */
  private methodSignature(method: MethodSymbol): string {
    const types = (method.parameters ?? [])
      .map((p) => p?.type?.name ?? 'Object')
      .join(',');
    return `${method.name.toLowerCase()}(${types.toLowerCase()})`;
  }
}
