/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Effect } from 'effect';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  ApexSymbol,
  SymbolKind,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  inTypeSymbolGroup,
  isBlockSymbol,
  isMethodSymbol as isMethodSymbolNarrowing,
} from '@salesforce/apex-lsp-parser-ast';
import { CompletionContext } from '../CompletionProcessingService';
import { CompletionStrategy, CompletionCandidate } from './CompletionStrategy';

/**
 * Completion candidate with relevance scoring for member access.
 */
export interface MemberCompletionCandidate {
  symbol: ApexSymbol;
  relevance: number;
  source: 'direct' | 'inherited' | 'interface' | 'object';
  isStatic: boolean;
}

/**
 * Describes the expression context before the dot.
 */
export interface DotExpressionContext {
  /** The kind of expression before the dot */
  kind:
    | 'variable' // myVar.
    | 'this' // this.
    | 'super' // super.
    | 'type' // ClassName.  (static access)
    | 'method-chain' // obj.method().
    | 'unknown';
  /** The text segments of the expression (e.g. ['obj', 'getAccount()'] for obj.getAccount().) */
  segments: string[];
  /** Whether we expect static members */
  expectStatic: boolean;
}

/**
 * Strategy for providing completions after a dot (member access).
 *
 * Handles:
 * - `myVar.`           -> instance members of myVar's type
 * - `ClassName.`       -> static members of ClassName
 * - `this.`            -> instance members of current class
 * - `super.`           -> members of superclass
 * - `obj.method().`    -> instance members of method return type
 */
export class MemberAccessCompletionStrategy implements CompletionStrategy {
  readonly name = 'MemberAccessCompletion';

  constructor(
    private readonly logger: LoggerInterface,
    private readonly symbolManager: ISymbolManager,
  ) {}

  canHandle(context: CompletionContext): boolean {
    if (context.triggerCharacter === '.') {
      return true;
    }
    const lineText = context.document.getText({
      start: { line: context.position.line, character: 0 },
      end: context.position,
    });
    return lineText.trimEnd().endsWith('.');
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const fileUri = context.document.uri;

      const exprContext = self.parseDotExpression(
        context.document,
        context.position,
      );
      if (exprContext.kind === 'unknown' || exprContext.segments.length === 0) {
        return [];
      }

      self.logger.debug(
        () =>
          `MemberAccess: kind=${exprContext.kind}, segments=[${exprContext.segments.join(', ')}]`,
      );

      const resolvedType = yield* Effect.promise(() =>
        self.resolveExpressionType(exprContext, fileUri, context.position),
      );

      if (!resolvedType) {
        self.logger.debug(
          () =>
            `MemberAccess: could not resolve type for ${exprContext.segments.join('.')}`,
        );
        return [];
      }

      self.logger.debug(
        () =>
          `MemberAccess: resolved to type ${resolvedType.name} (${resolvedType.kind})`,
      );

      const candidates = yield* self.getMembersOfTypeEffect(
        resolvedType,
        exprContext.expectStatic,
        fileUri,
      );

      self.logger.debug(
        () => `MemberAccess: found ${candidates.length} member candidates`,
      );

      return candidates.map((c) => ({
        symbol: c.symbol,
        relevance: c.relevance,
        context: 'member access',
      }));
    });
  }

  // ---------------------------------------------------------------------------
  // Expression Parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse the dot-expression text before the cursor to determine what to resolve.
   */
  parseDotExpression(
    document: TextDocument,
    position: { line: number; character: number },
  ): DotExpressionContext {
    // Get text from start of line up to cursor
    const lineText = document.getText({
      start: { line: position.line, character: 0 },
      end: position,
    });

    // Remove the trailing dot
    const trimmed = lineText.trimEnd();
    const beforeDot = trimmed.endsWith('.')
      ? trimmed.slice(0, -1).trimEnd()
      : trimmed;

    if (!beforeDot) {
      return { kind: 'unknown', segments: [], expectStatic: false };
    }

    // Extract the expression from the end of the line working backwards.
    // Stop at characters that cannot be part of a member access chain:
    // space (outside parens), semicolons, braces, operators, etc.
    const expr = this.extractExpressionBackward(beforeDot);

    if (!expr) {
      return { kind: 'unknown', segments: [], expectStatic: false };
    }

    // Split into segments on '.'
    const segments = this.splitChainSegments(expr);

    if (segments.length === 0) {
      return { kind: 'unknown', segments: [], expectStatic: false };
    }

    // Identify the kind of expression
    const firstSegment = segments[0].toLowerCase();

    if (firstSegment === 'this') {
      return { kind: 'this', segments, expectStatic: false };
    }

    if (firstSegment === 'super') {
      return { kind: 'super', segments, expectStatic: false };
    }

    // If there is only one segment and it starts with uppercase, it might be a type (static access).
    // We'll check later during resolution if it's actually a type or a variable.
    if (segments.length === 1) {
      const seg = segments[0];
      // Heuristic: if first letter is uppercase and it's not a method call, likely a type
      if (
        seg[0] &&
        seg[0] === seg[0].toUpperCase() &&
        seg[0] !== seg[0].toLowerCase() &&
        !seg.includes('(')
      ) {
        return { kind: 'type', segments, expectStatic: true };
      }
      return { kind: 'variable', segments, expectStatic: false };
    }

    // Multi-segment: could be chained access (method-chain)
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.includes('(')) {
      return { kind: 'method-chain', segments, expectStatic: false };
    }

    return { kind: 'variable', segments, expectStatic: false };
  }

  /**
   * Extract a dotted expression from the end of a text, respecting parentheses.
   */
  private extractExpressionBackward(text: string): string {
    let parenDepth = 0;
    let i = text.length - 1;

    while (i >= 0) {
      const ch = text[i];
      if (ch === ')') {
        parenDepth++;
        i--;
        continue;
      }
      if (ch === '(') {
        parenDepth--;
        if (parenDepth < 0) break; // unmatched open-paren — stop
        i--;
        continue;
      }
      if (parenDepth > 0) {
        // Inside parentheses — skip everything
        i--;
        continue;
      }

      // Outside parens: valid expression chars are alphanumeric, _, .
      if (/[a-zA-Z0-9_.]/.test(ch)) {
        i--;
        continue;
      }
      // Any other char stops the expression
      break;
    }

    return text.slice(i + 1).trim();
  }

  /**
   * Split 'obj.method(arg).field' into ['obj', 'method(arg)', 'field']
   * respecting parentheses.
   */
  private splitChainSegments(expr: string): string[] {
    const segments: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (const ch of expr) {
      if (ch === '(') {
        parenDepth++;
        current += ch;
      } else if (ch === ')') {
        parenDepth--;
        current += ch;
      } else if (ch === '.' && parenDepth === 0) {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) {
      segments.push(current.trim());
    }
    return segments;
  }

  // ---------------------------------------------------------------------------
  // Expression Type Resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolve the expression before the dot to its resulting type symbol.
   */
  private async resolveExpressionType(
    exprContext: DotExpressionContext,
    fileUri: string,
    cursorPosition: { line: number; character: number },
  ): Promise<TypeSymbol | null> {
    const { kind, segments } = exprContext;

    switch (kind) {
      case 'this':
        return this.resolveThisType(fileUri, cursorPosition);

      case 'super':
        return this.resolveSuperType(fileUri, cursorPosition);

      case 'type':
        return this.resolveAsType(segments[0]);

      case 'variable':
        return this.resolveVariableType(segments[0], fileUri, cursorPosition);

      case 'method-chain':
        return this.resolveChainType(segments, fileUri, cursorPosition);

      default:
        return null;
    }
  }

  /**
   * Resolve `this` to the containing class type.
   */
  private async resolveThisType(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<TypeSymbol | null> {
    const symbolTable = await this.symbolManager.getSymbolTableForFile(fileUri);
    if (!symbolTable) return null;

    // Find the class that contains the current position
    const allSymbols = symbolTable.getAllSymbols();
    const containingClass = this.findContainingClass(allSymbols, position);
    return containingClass ?? null;
  }

  /**
   * Resolve `super` to the superclass type.
   */
  private async resolveSuperType(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<TypeSymbol | null> {
    const currentClass = await this.resolveThisType(fileUri, position);
    if (!currentClass || !currentClass.superClass) return null;

    return this.resolveTypeByName(currentClass.superClass);
  }

  /**
   * Try to resolve a name as a type (for static access like ClassName.).
   * Falls back to resolving as a variable if not a known type.
   */
  private async resolveAsType(name: string): Promise<TypeSymbol | null> {
    const symbols = await this.symbolManager.findSymbolByName(name);
    const typeSymbol = symbols.find(
      (s) =>
        s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum,
    );
    if (typeSymbol && inTypeSymbolGroup(typeSymbol)) {
      return typeSymbol;
    }

    // Try standard library
    const isStdLib = await this.symbolManager.isStandardLibraryType(name);
    if (isStdLib) {
      const stdSymbols = await this.symbolManager.findSymbolByName(name);
      const stdType = stdSymbols.find(
        (s) =>
          s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum,
      );
      if (stdType && inTypeSymbolGroup(stdType)) {
        return stdType;
      }
    }

    return null;
  }

  /**
   * Resolve a variable name to its declared type.
   */
  private async resolveVariableType(
    name: string,
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<TypeSymbol | null> {
    const symbolTable = await this.symbolManager.getSymbolTableForFile(fileUri);
    if (!symbolTable) return null;

    const allSymbols = symbolTable.getAllSymbols();

    // Search for variable/field/parameter in scope hierarchy
    const variable = this.findVariableInScope(allSymbols, name, position);
    if (variable) {
      return this.resolveVariableSymbolType(variable);
    }

    // Fallback: search all symbols in the file for a field/property with this name
    const fieldSymbol = allSymbols.find(
      (s) =>
        s.name === name &&
        (s.kind === SymbolKind.Field ||
          s.kind === SymbolKind.Property ||
          s.kind === SymbolKind.Variable ||
          s.kind === SymbolKind.Parameter),
    );
    if (fieldSymbol) {
      return this.resolveVariableSymbolType(fieldSymbol as VariableSymbol);
    }

    // If not found locally, maybe it's a type (user typed lowercase but it's a class)
    return this.resolveAsType(name);
  }

  /**
   * Resolve a chain of segments like ['obj', 'getAccount()', 'Name'] to the final type.
   */
  private async resolveChainType(
    segments: string[],
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<TypeSymbol | null> {
    if (segments.length === 0) return null;

    // Resolve the first segment
    const firstSeg = segments[0];
    let currentType: TypeSymbol | null;

    if (firstSeg.toLowerCase() === 'this') {
      currentType = await this.resolveThisType(fileUri, position);
    } else if (firstSeg.toLowerCase() === 'super') {
      currentType = await this.resolveSuperType(fileUri, position);
    } else if (firstSeg.includes('(')) {
      // Method call as first segment — look up in current class
      const methodName = firstSeg.replace(/\(.*\)$/, '');
      const thisType = await this.resolveThisType(fileUri, position);
      if (thisType) {
        currentType = await this.resolveMethodReturnType(thisType, methodName);
      } else {
        currentType = null;
      }
    } else {
      currentType = await this.resolveVariableType(firstSeg, fileUri, position);
    }

    // Walk subsequent segments
    for (let i = 1; i < segments.length && currentType; i++) {
      const seg = segments[i];
      if (seg.includes('(')) {
        // Method call
        const methodName = seg.replace(/\(.*\)$/, '');
        currentType = await this.resolveMethodReturnType(
          currentType,
          methodName,
        );
      } else {
        // Field/property access
        currentType = await this.resolveFieldType(currentType, seg);
      }
    }

    return currentType;
  }

  // ---------------------------------------------------------------------------
  // Type Resolution Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve a type name to a TypeSymbol using the symbol manager.
   */
  private async resolveTypeByName(
    typeName: string,
  ): Promise<TypeSymbol | null> {
    // Strip generic parameters and array brackets
    const baseName = typeName.replace(/<.*>/, '').replace(/\[\]$/, '');

    const symbols = await this.symbolManager.findSymbolByName(baseName);
    const typeSymbol = symbols.find(
      (s) =>
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
   * Given a VariableSymbol, resolve its declared type to a TypeSymbol.
   */
  private async resolveVariableSymbolType(
    variable: ApexSymbol,
  ): Promise<TypeSymbol | null> {
    const varSym = variable as VariableSymbol;
    if (!varSym.type) return null;

    // If the type has a resolved symbol already, use it
    if (
      varSym.type.resolvedSymbol &&
      inTypeSymbolGroup(varSym.type.resolvedSymbol)
    ) {
      return varSym.type.resolvedSymbol as TypeSymbol;
    }

    // Otherwise resolve by name
    const typeName = varSym.type.name;
    if (!typeName) return null;

    return this.resolveTypeByName(typeName);
  }

  /**
   * Resolve the return type of a method on a given type.
   */
  private async resolveMethodReturnType(
    ownerType: TypeSymbol,
    methodName: string,
  ): Promise<TypeSymbol | null> {
    // Find the method in the type's symbol table
    const members = await this.getDirectMembers(ownerType);
    const method = members.find(
      (s) =>
        s.kind === SymbolKind.Method &&
        s.name.toLowerCase() === methodName.toLowerCase(),
    );

    if (method && isMethodSymbolNarrowing(method)) {
      const methodSym = method as MethodSymbol;
      if (methodSym.returnType) {
        if (
          methodSym.returnType.resolvedSymbol &&
          inTypeSymbolGroup(methodSym.returnType.resolvedSymbol)
        ) {
          return methodSym.returnType.resolvedSymbol as TypeSymbol;
        }
        if (methodSym.returnType.name) {
          return this.resolveTypeByName(methodSym.returnType.name);
        }
      }
    }

    // Try inherited methods
    if (ownerType.superClass) {
      const superType = await this.resolveTypeByName(ownerType.superClass);
      if (superType) {
        return this.resolveMethodReturnType(superType, methodName);
      }
    }

    return null;
  }

  /**
   * Resolve the type of a field/property on a given type.
   */
  private async resolveFieldType(
    ownerType: TypeSymbol,
    fieldName: string,
  ): Promise<TypeSymbol | null> {
    const members = await this.getDirectMembers(ownerType);
    const field = members.find(
      (s) =>
        (s.kind === SymbolKind.Field || s.kind === SymbolKind.Property) &&
        s.name.toLowerCase() === fieldName.toLowerCase(),
    );

    if (field) {
      return this.resolveVariableSymbolType(field);
    }

    // Try inherited fields
    if (ownerType.superClass) {
      const superType = await this.resolveTypeByName(ownerType.superClass);
      if (superType) {
        return this.resolveFieldType(superType, fieldName);
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Member Collection
  // ---------------------------------------------------------------------------

  /**
   * Get all members of a type (direct + inherited), filtered by static/instance context.
   */
  getMembersOfTypeEffect(
    typeSymbol: TypeSymbol,
    expectStatic: boolean,
    fileUri: string,
  ): Effect.Effect<MemberCompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: MemberCompletionCandidate[] = [];
      const seenNames = new Set<string>();

      const directMembers = yield* Effect.promise(() =>
        self.getDirectMembers(typeSymbol),
      );
      for (let i = 0; i < directMembers.length; i++) {
        const member = directMembers[i];
        if (self.shouldIncludeMember(member, expectStatic)) {
          const key = self.memberKey(member);
          if (!seenNames.has(key)) {
            seenNames.add(key);
            candidates.push({
              symbol: member,
              relevance: 1.0,
              source: 'direct',
              isStatic: member.modifiers?.isStatic ?? false,
            });
          }
        }
        if ((i + 1) % 50 === 0) {
          yield* Effect.yieldNow();
        }
      }

      let currentType: TypeSymbol | null = typeSymbol;
      let depth = 0;
      while (currentType?.superClass && depth < 10) {
        const superType = yield* Effect.promise(() =>
          self.resolveTypeByName(currentType!.superClass!),
        );
        if (!superType) break;

        const superMembers = yield* Effect.promise(() =>
          self.getDirectMembers(superType),
        );
        for (const member of superMembers) {
          if (self.shouldIncludeMember(member, expectStatic)) {
            const key = self.memberKey(member);
            if (!seenNames.has(key)) {
              seenNames.add(key);
              candidates.push({
                symbol: member,
                relevance: 0.8 - depth * 0.05,
                source: 'inherited',
                isStatic: member.modifiers?.isStatic ?? false,
              });
            }
          }
        }
        yield* Effect.yieldNow();

        currentType = superType;
        depth++;
      }

      if (typeSymbol.interfaces && typeSymbol.interfaces.length > 0) {
        for (const ifaceName of typeSymbol.interfaces) {
          const ifaceType = yield* Effect.promise(() =>
            self.resolveTypeByName(ifaceName),
          );
          if (ifaceType) {
            const ifaceMembers = yield* Effect.promise(() =>
              self.getDirectMembers(ifaceType),
            );
            for (const member of ifaceMembers) {
              if (self.shouldIncludeMember(member, expectStatic)) {
                const key = self.memberKey(member);
                if (!seenNames.has(key)) {
                  seenNames.add(key);
                  candidates.push({
                    symbol: member,
                    relevance: 0.7,
                    source: 'interface',
                    isStatic: member.modifiers?.isStatic ?? false,
                  });
                }
              }
            }
          }
          yield* Effect.yieldNow();
        }
      }

      candidates.sort((a, b) => b.relevance - a.relevance);
      return candidates;
    });
  }

  async getMembersOfType(
    typeSymbol: TypeSymbol,
    expectStatic: boolean,
    fileUri: string,
  ): Promise<MemberCompletionCandidate[]> {
    return Effect.runPromise(
      this.getMembersOfTypeEffect(typeSymbol, expectStatic, fileUri),
    );
  }

  /**
   * Get direct members (methods, fields, properties, inner classes) of a type.
   */
  private async getDirectMembers(
    typeSymbol: TypeSymbol,
  ): Promise<ApexSymbol[]> {
    if (!typeSymbol.fileUri) return [];

    const symbolTable = await this.symbolManager.getSymbolTableForFile(
      typeSymbol.fileUri,
    );
    if (!symbolTable) {
      // Fallback: use findSymbolsInFile
      const fileSymbols = await this.symbolManager.findSymbolsInFile(
        typeSymbol.fileUri,
      );
      return fileSymbols.filter((s) =>
        this.isMemberOf(s, typeSymbol, fileSymbols),
      );
    }

    const allSymbols = symbolTable.getAllSymbols();

    // Find the class block scope for this type
    const classBlock = allSymbols.find(
      (s) =>
        isBlockSymbol(s) &&
        (s as any).scopeType === 'class' &&
        (s.parentId === typeSymbol.id ||
          // Some class blocks might have a different parent structure
          (s.fileUri === typeSymbol.fileUri &&
            allSymbols.find(
              (ts) =>
                ts.id === s.parentId &&
                ts.name === typeSymbol.name &&
                ts.kind === typeSymbol.kind,
            ) !== undefined)),
    );

    if (classBlock) {
      // Get symbols directly in this class scope
      const scopeMembers = symbolTable.getSymbolsInScope(classBlock.id);
      // Also get symbols nested in method blocks that are direct members
      const directMembers = allSymbols.filter(
        (s) =>
          !isBlockSymbol(s) &&
          s.fileUri === typeSymbol.fileUri &&
          s.parentId === classBlock.id &&
          s.kind !== SymbolKind.Variable && // Skip local variables
          s.kind !== SymbolKind.Parameter, // Skip parameters
      );

      // Combine scope members and direct members, deduplicate by id
      const seen = new Set<string>();
      const result: ApexSymbol[] = [];
      for (const sym of [...scopeMembers, ...directMembers]) {
        if (!seen.has(sym.id) && !isBlockSymbol(sym)) {
          seen.add(sym.id);
          // Only include member-like symbols
          if (
            sym.kind === SymbolKind.Method ||
            sym.kind === SymbolKind.Constructor ||
            sym.kind === SymbolKind.Field ||
            sym.kind === SymbolKind.Property ||
            sym.kind === SymbolKind.Class || // inner class
            sym.kind === SymbolKind.Interface ||
            sym.kind === SymbolKind.Enum ||
            sym.kind === SymbolKind.EnumValue
          ) {
            result.push(sym);
          }
        }
      }
      return result;
    }

    // Fallback: find members by parent relationship or file containment
    return allSymbols.filter((s) => this.isMemberOf(s, typeSymbol, allSymbols));
  }

  /**
   * Check if a symbol is a member of the given type.
   */
  private isMemberOf(
    symbol: ApexSymbol,
    typeSymbol: TypeSymbol,
    allSymbols: ApexSymbol[],
  ): boolean {
    if (isBlockSymbol(symbol)) return false;
    if (symbol.id === typeSymbol.id) return false;
    if (symbol.fileUri !== typeSymbol.fileUri) return false;

    // Skip local variables and parameters
    if (
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter
    ) {
      return false;
    }

    // Check direct parentId
    if (symbol.parentId === typeSymbol.id) return true;

    // Check if parent is a class block of the type
    const parent = allSymbols.find((s) => s.id === symbol.parentId);
    if (
      parent &&
      isBlockSymbol(parent) &&
      (parent as any).scopeType === 'class'
    ) {
      if (parent.parentId === typeSymbol.id) return true;
    }

    return false;
  }

  /**
   * Filter: should a member be included based on static/instance context?
   */
  private shouldIncludeMember(
    member: ApexSymbol,
    expectStatic: boolean,
  ): boolean {
    // Skip block symbols
    if (isBlockSymbol(member)) return false;

    // Skip variables and parameters (they're not class members exposed via dot)
    if (
      member.kind === SymbolKind.Variable ||
      member.kind === SymbolKind.Parameter
    ) {
      return false;
    }

    // Constructors are not accessed via dot notation
    if (member.kind === SymbolKind.Constructor) return false;

    const isStatic = member.modifiers?.isStatic ?? false;

    if (expectStatic) {
      // For static access (ClassName.), show static members + inner classes
      return (
        isStatic ||
        member.kind === SymbolKind.Class ||
        member.kind === SymbolKind.Interface ||
        member.kind === SymbolKind.Enum ||
        member.kind === SymbolKind.EnumValue
      );
    }

    // For instance access, show instance (non-static) members
    return !isStatic || member.kind === SymbolKind.EnumValue;
  }

  private memberKey(member: ApexSymbol): string {
    if (
      (member.kind === SymbolKind.Method ||
        member.kind === SymbolKind.Constructor) &&
      isMethodSymbolNarrowing(member)
    ) {
      const m = member as MethodSymbol;
      const paramTypes = (m.parameters ?? [])
        .map((p) => (p.type?.name ?? '').toLowerCase())
        .join(',');
      return `${member.kind}:${member.name}(${paramTypes})`;
    }
    return `${member.kind}:${member.name}`;
  }

  // ---------------------------------------------------------------------------
  // Scope Helpers
  // ---------------------------------------------------------------------------

  /**
   * Find a variable/field/parameter by name in the scope hierarchy at the given position.
   */
  private findVariableInScope(
    allSymbols: ApexSymbol[],
    name: string,
    position: { line: number; character: number },
  ): VariableSymbol | null {
    // Find matching variable-like symbols
    const matches = allSymbols.filter(
      (s) =>
        s.name === name &&
        (s.kind === SymbolKind.Variable ||
          s.kind === SymbolKind.Field ||
          s.kind === SymbolKind.Property ||
          s.kind === SymbolKind.Parameter),
    );

    if (matches.length === 0) return null;

    // Prefer the one that is declared before the position and closest to it
    const declared = matches.filter((s) => {
      const declLine = s.location.symbolRange.startLine;
      return declLine <= position.line;
    });

    if (declared.length > 0) {
      // Sort by declaration line descending (closest first)
      declared.sort(
        (a, b) =>
          b.location.symbolRange.startLine - a.location.symbolRange.startLine,
      );
      return declared[0] as VariableSymbol;
    }

    // If no match before position (might be a class field), return any match
    return matches[0] as VariableSymbol;
  }

  /**
   * Find the class that contains the given position.
   */
  private findContainingClass(
    allSymbols: ApexSymbol[],
    position: { line: number; character: number },
  ): TypeSymbol | undefined {
    const classSymbols = allSymbols.filter(
      (s) =>
        (s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum) &&
        s.location.symbolRange.startLine <= position.line &&
        s.location.symbolRange.endLine >= position.line,
    );

    if (classSymbols.length === 0) return undefined;

    // If multiple (nested classes), return the innermost (smallest range)
    classSymbols.sort((a, b) => {
      const aSize =
        a.location.symbolRange.endLine - a.location.symbolRange.startLine;
      const bSize =
        b.location.symbolRange.endLine - b.location.symbolRange.startLine;
      return aSize - bSize;
    });

    return classSymbols[0] as TypeSymbol;
  }
}
