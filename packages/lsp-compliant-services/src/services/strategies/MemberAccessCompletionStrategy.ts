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
  ISymbolManager,
  ApexSymbol,
  SymbolKind,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  type TypeInfo,
  type SymbolReference,
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
    return context.document.uri.length > 0;
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const fileUri = context.document.uri;

      const receiverReference =
        context.incompleteMemberAccess ??
        (yield* Effect.promise(() =>
          self.symbolManager.getIncompleteMemberAccessAtPosition(
            fileUri,
            context.position,
          ),
        ));
      if (!receiverReference) {
        return [];
      }

      self.logger.debug(
        () =>
          `MemberAccess: parser receiver=${receiverReference.name}, ` +
          `resolved=${receiverReference.resolvedSymbolId ?? 'no'}`,
      );

      const receiver = yield* Effect.promise(() =>
        self.resolveReceiverReference(
          receiverReference,
          fileUri,
          context.position,
        ),
      );

      if (!receiver) {
        self.logger.debug(
          () =>
            `MemberAccess: could not resolve parser receiver ${receiverReference.name}`,
        );
        return [];
      }

      const { type: resolvedType, expectStatic } = receiver;

      self.logger.debug(
        () =>
          `MemberAccess: resolved to type ${resolvedType.name} (${resolvedType.kind})`,
      );

      const candidates = yield* self.getMembersOfTypeEffect(
        resolvedType,
        expectStatic,
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
  // Expression Type Resolution
  // ---------------------------------------------------------------------------

  private async resolveReceiverReference(
    reference: SymbolReference,
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<{ type: TypeSymbol; expectStatic: boolean } | null> {
    const receiverNode =
      reference.chainNodes?.[reference.chainNodes.length - 1] ?? reference;
    const normalizedName = receiverNode.name.toLowerCase();
    const isIndexedReceiver = [reference, ...(reference.chainNodes ?? [])].some(
      (node) =>
        (
          node.semanticContext as
            { indexedAccess?: { kind: 'indexed-access' } } | undefined
        )?.indexedAccess !== undefined,
    );
    if (normalizedName === 'this') {
      const type = await this.resolveThisType(fileUri, position);
      return type ? { type, expectStatic: false } : null;
    }
    if (normalizedName === 'super') {
      const type = await this.resolveSuperType(fileUri, position);
      return type ? { type, expectStatic: false } : null;
    }

    // A completed chain can carry the resolved final member on the aggregate
    // reference while its final chain node remains unresolved. Both ids are
    // parser-owned identities; prefer the most specific node, then the
    // aggregate identity, without attempting a global name lookup.
    const resolvedSymbolIds = [
      receiverNode.resolvedSymbolId,
      reference.resolvedSymbolId,
    ].filter(
      (id, index, ids): id is string =>
        id !== undefined && ids.indexOf(id) === index,
    );
    for (const resolvedSymbolId of resolvedSymbolIds) {
      const resolved = await this.symbolManager.getSymbol(resolvedSymbolId);
      if (resolved && inTypeSymbolGroup(resolved)) {
        return {
          type: await this.currentTypeSymbol(resolved),
          expectStatic: true,
        };
      }
      if (
        resolved &&
        (resolved.kind === SymbolKind.Variable ||
          resolved.kind === SymbolKind.Field ||
          resolved.kind === SymbolKind.Property ||
          resolved.kind === SymbolKind.Parameter)
      ) {
        const type = await this.resolveVariableSymbolType(
          resolved as VariableSymbol,
          isIndexedReceiver,
        );
        if (type) {
          return { type, expectStatic: false };
        }
      }
      if (resolved && isMethodSymbolNarrowing(resolved)) {
        const returnType = this.receiverResultType(
          (resolved as MethodSymbol).returnType,
          isIndexedReceiver,
        );
        const type = returnType ? await this.resolveTypeInfo(returnType) : null;
        if (type) {
          return { type, expectStatic: false };
        }
      }
    }

    const visible = await this.symbolManager.getVisibleSymbolsAtPosition(
      fileUri,
      position,
    );
    const value = visible.find(
      (symbol) =>
        symbol.name.toLowerCase() === normalizedName &&
        (symbol.kind === SymbolKind.Variable ||
          symbol.kind === SymbolKind.Field ||
          symbol.kind === SymbolKind.Property ||
          symbol.kind === SymbolKind.Parameter),
    );
    if (value) {
      const type = await this.resolveVariableSymbolType(
        value as VariableSymbol,
        isIndexedReceiver,
      );
      if (type) {
        return { type, expectStatic: false };
      }
    }

    const type = await this.resolveAsType(receiverNode.name);
    return type ? { type, expectStatic: true } : null;
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
    const byFqn = await this.symbolManager.findSymbolByFQN(name);
    if (byFqn && inTypeSymbolGroup(byFqn)) {
      return this.currentTypeSymbol(byFqn);
    }

    const types = this.uniqueTypes(
      (await this.symbolManager.findSymbolByName(name)).filter(
        inTypeSymbolGroup,
      ),
    );
    if (types.length === 1) {
      return this.currentTypeSymbol(types[0]);
    }

    // Never let name-index insertion order decide between distinct type
    // identities. An unresolved ambiguous receiver produces no candidates.
    return null;
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
    return this.resolveAsType(typeName);
  }

  /** Resolve parser-owned TypeInfo without reparsing its display string. */
  private async resolveTypeInfo(
    typeInfo: TypeInfo,
  ): Promise<TypeSymbol | null> {
    if (typeInfo.resolvedSymbol && inTypeSymbolGroup(typeInfo.resolvedSymbol)) {
      const current = await this.symbolManager.getSymbol(
        typeInfo.resolvedSymbol.id,
      );
      if (current && inTypeSymbolGroup(current)) {
        return this.currentTypeSymbol(current);
      }
      return this.currentTypeSymbol(typeInfo.resolvedSymbol);
    }

    if (typeInfo.resolvedType && typeInfo.resolvedType !== typeInfo) {
      const resolved = await this.resolveTypeInfo(typeInfo.resolvedType);
      if (resolved) return resolved;
    }

    const namespace =
      typeInfo.namespace?.toString() ?? typeInfo.getNamespace()?.toString();
    if (namespace) {
      const byFqn = await this.symbolManager.findSymbolByFQN(
        `${namespace}.${typeInfo.name}`,
      );
      if (byFqn && inTypeSymbolGroup(byFqn)) {
        return this.currentTypeSymbol(byFqn);
      }

      // Managed Apex artifacts are keyed by their canonical VFS owner URI.
      // Older remote symbol tables do not always copy that owner namespace
      // onto the parsed TypeSymbol, so a namespace-filtered name lookup would
      // incorrectly discard the authoritative type. Resolve only the exact
      // namespace/type artifact requested by the structured TypeInfo.
      const managedType = await this.resolveManagedArtifactType(
        namespace,
        typeInfo.name,
      );
      if (managedType) return managedType;

      const namespaceMatches = this.uniqueTypes(
        (await this.symbolManager.findSymbolByName(typeInfo.name))
          .filter(inTypeSymbolGroup)
          .filter(
            (candidate) =>
              this.symbolNamespace(candidate).toLowerCase() ===
              namespace.toLowerCase(),
          ),
      );
      return namespaceMatches.length === 1
        ? this.currentTypeSymbol(namespaceMatches[0])
        : null;
    }

    return this.resolveAsType(typeInfo.name);
  }

  private async resolveManagedArtifactType(
    namespace: string,
    typeName: string,
  ): Promise<TypeSymbol | null> {
    const artifactUri =
      'apex-org-artifact:/apex-class/' +
      `${namespace.toLowerCase()}.${typeName.toLowerCase()}.cls`;
    const table = await this.symbolManager.getSymbolTableForFile(artifactUri);
    if (!table) return null;

    const ownedTypes = this.uniqueTypes(
      table
        .getAllSymbols()
        .filter(inTypeSymbolGroup)
        .filter(
          (candidate) =>
            (candidate.parentId === null || candidate.parentId === 'null') &&
            candidate.fileUri === artifactUri &&
            candidate.name.toLowerCase() === typeName.toLowerCase(),
        ),
    );
    return ownedTypes.length === 1
      ? this.currentTypeSymbol(ownedTypes[0])
      : null;
  }

  private receiverResultType(
    declaredType: TypeInfo | undefined,
    indexed: boolean,
  ): TypeInfo | null {
    if (!declaredType) return null;
    if (!indexed) return declaredType;

    if (declaredType.isArray) {
      return declaredType.typeParameters?.length === 1
        ? declaredType.typeParameters[0]
        : null;
    }
    if (!declaredType.isCollection) return null;

    const collectionName = declaredType.name.toLowerCase();
    if (collectionName !== 'list' && collectionName !== 'map') {
      return null;
    }
    // Map stores its key independently and its value as the sole type
    // parameter. List/Set likewise carry one structural element parameter.
    return declaredType.typeParameters?.length === 1
      ? declaredType.typeParameters[0]
      : null;
  }

  private uniqueTypes(types: TypeSymbol[]): TypeSymbol[] {
    return [...new Map(types.map((type) => [type.id, type])).values()];
  }

  private symbolNamespace(symbol: TypeSymbol): string {
    if (typeof symbol.namespace === 'string') return symbol.namespace;
    return symbol.namespace?.toString() ?? '';
  }

  private async currentTypeSymbol(type: TypeSymbol): Promise<TypeSymbol> {
    if (!type.fileUri) return type;
    const table = await this.symbolManager.getSymbolTableForFile(type.fileUri);
    if (table?.getMetadata().parseCompleteness !== 'complete') return type;

    const exactId = table
      .getAllSymbols()
      .find((symbol) => symbol.id === type.id);
    if (exactId && inTypeSymbolGroup(exactId)) return exactId;

    const exactIdentity = table
      .getAllSymbols()
      .find(
        (symbol) =>
          inTypeSymbolGroup(symbol) &&
          symbol.name.toLowerCase() === type.name.toLowerCase() &&
          (type.fqn
            ? symbol.fqn?.toLowerCase() === type.fqn.toLowerCase()
            : this.symbolNamespace(symbol).toLowerCase() ===
              this.symbolNamespace(type).toLowerCase()),
      );
    return exactIdentity && inTypeSymbolGroup(exactIdentity)
      ? exactIdentity
      : type;
  }

  /**
   * Given a VariableSymbol, resolve its declared type to a TypeSymbol.
   */
  private async resolveVariableSymbolType(
    variable: ApexSymbol,
    indexed = false,
  ): Promise<TypeSymbol | null> {
    const varSym = variable as VariableSymbol;
    if (!varSym.type) return null;
    const resultType = this.receiverResultType(varSym.type, indexed);
    return resultType ? this.resolveTypeInfo(resultType) : null;
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

      // Guard against cyclic inheritance (`A extends B extends A`) by
      // tracking visited type ids; depth cap remains as a defense-in-depth.
      const visited = new Set<string>([typeSymbol.id]);
      let currentType: TypeSymbol | null = typeSymbol;
      let depth = 0;
      while (currentType?.superClass && depth < 10) {
        const superType = yield* Effect.promise(() =>
          self.resolveTypeByName(currentType!.superClass!),
        );
        if (!superType) break;
        if (visited.has(superType.id)) break;
        visited.add(superType.id);

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
