/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ImplementationParams,
  Location,
  Range,
} from 'vscode-languageserver-protocol';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ApexSymbol,
  inTypeSymbolGroup,
  TypeSymbol,
  isMethodSymbol,
  MethodSymbol,
  SymbolKind,
  isPositionWithinLocation,
} from '@salesforce/apex-lsp-parser-ast';
import {
  transformLspToParserPosition,
  transformParserToLspPosition,
} from '../utils/positionUtils';

import { MissingArtifactUtils } from '../utils/missingArtifactUtils';

/**
 * Interface for implementation processing functionality
 */
export interface IImplementationProcessor {
  /**
   * Process an implementation request
   * @param params The implementation parameters
   * @returns Implementation locations for the requested symbol
   */
  processImplementation(params: ImplementationParams): Promise<Location[]>;
}

/**
 * Service for processing implementation requests using ApexSymbolManager
 * Finds all classes that implement an interface or all methods that implement an abstract method
 */
export class ImplementationProcessingService implements IImplementationProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly missingArtifactUtils: MissingArtifactUtils;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    this.missingArtifactUtils = new MissingArtifactUtils(
      logger,
      this.symbolManager,
    );
  }

  /**
   * Process an implementation request
   * @param params The implementation parameters
   * @returns Implementation locations for the requested symbol
   */
  public async processImplementation(
    params: ImplementationParams,
  ): Promise<Location[]> {
    this.logger.debug(
      () => `Processing implementation request for: ${params.textDocument.uri}`,
    );

    try {
      // Transform LSP position (0-based) to parser-ast position (1-based line, 0-based column)
      const parserPosition = transformLspToParserPosition(params.position);

      // Get TypeReferences at position first
      const references = await this.symbolManager.getReferencesAtPosition(
        params.textDocument.uri,
        parserPosition,
      );

      this.logger.debug(
        () =>
          `[impl] uri=${params.textDocument.uri} ` +
          `parserPos=${parserPosition.line}:${parserPosition.character} ` +
          `refs=${JSON.stringify(references?.map((r: any) => r.name))}`,
      );

      // If no TypeReference exists, try scope-based resolution as a fallback for
      // declaration sites: interface declarations, abstract/virtual methods, and
      // interface method declarations (which have no TypeReferences at their position).
      if (!references || references.length === 0) {
        const scopeSymbol = await this.symbolManager.getSymbolAtPosition(
          params.textDocument.uri,
          parserPosition,
          'scope',
        );
        this.logger.debug(
          () =>
            `[impl] no refs — scope symbol: ${scopeSymbol ? `${scopeSymbol.name} (${scopeSymbol.kind})` : 'null'}`,
        );
        // identifierRange guard (mirrors the 6.11 find-references guard that
        // standardized on the 'precise' strategy). The 'scope' strategy's
        // Step-4 fallback returns the *enclosing* method/class whenever the
        // cursor is anywhere inside that symbol's scope body — including on
        // whitespace, punctuation, or a keyword — because it matches on the
        // symbol's full symbolRange, not its declaration identifier. Without
        // this guard, go-to-implementation with the cursor on a non-identifier
        // position inside an abstract/interface method body would return
        // implementations for the enclosing symbol instead of nothing. Require
        // the cursor to land on the symbol's own declaration identifier
        // (identifierRange) before honoring the scope fallback.
        if (
          scopeSymbol &&
          !this.isCursorOnDeclarationIdentifier(scopeSymbol, parserPosition)
        ) {
          this.logger.debug(
            () =>
              `[impl] scope symbol ${scopeSymbol.name} rejected — cursor not on its ` +
              'declaration identifier (non-identifier position); returning []',
          );
          return [];
        }
        if (scopeSymbol) {
          // Interface declaration — find all implementing classes
          if (scopeSymbol.kind === SymbolKind.Interface) {
            const locations =
              await this.getImplementationLocations(scopeSymbol);
            this.logger.debug(
              () =>
                `[impl] interface path: ${locations.length} locations for ${scopeSymbol.name}`,
            );
            return locations;
          }
          // Abstract/virtual method or interface method — resolve via file symbols then dispatch
          if (
            isMethodSymbol(scopeSymbol) &&
            (scopeSymbol.modifiers?.isAbstract ||
              scopeSymbol.modifiers?.isVirtual)
          ) {
            const locations =
              await this.getImplementationLocations(scopeSymbol);
            this.logger.debug(
              () =>
                `[impl] method path: ${locations.length} locations for ${scopeSymbol.name}`,
            );
            return locations;
          }
          // Block symbol for a method scope — resolve to the MethodSymbol from the file
          if (
            scopeSymbol.kind === SymbolKind.Block &&
            (scopeSymbol as any).scopeType === 'method' &&
            scopeSymbol.fileUri
          ) {
            const fileSymbols = await this.symbolManager.findSymbolsInFile(
              scopeSymbol.fileUri,
            );
            this.logger.debug(
              () =>
                `[impl] block/method path for ${scopeSymbol.name}: ` +
                `${fileSymbols.filter((s: any) => s.name === scopeSymbol.name).length} matching file symbols`,
            );
            const methodSymbol = fileSymbols.find(
              (s) =>
                isMethodSymbol(s) &&
                s.name === scopeSymbol.name &&
                (s.modifiers?.isAbstract || s.modifiers?.isVirtual),
            ) as MethodSymbol | undefined;
            if (methodSymbol) {
              const locations =
                await this.getImplementationLocations(methodSymbol);
              this.logger.debug(
                () =>
                  `[impl] block/method resolved: ${locations.length} locations for ${methodSymbol.name}`,
              );
              return locations;
            }
          }
        }
        this.logger.debug(() => {
          const parserPos = `${parserPosition.line}:${parserPosition.character}`;
          return `[impl] no match at parser position ${parserPos} — returning []`;
        });
        return [];
      }

      // Use precise symbol resolution
      let symbol = await this.symbolManager.getSymbolAtPosition(
        params.textDocument.uri,
        parserPosition,
        'precise',
      );

      if (!symbol) {
        this.logger.debug(
          () =>
            `No symbol found at parser position ${parserPosition.line}:${parserPosition.character}`,
        );

        // Try missing artifact resolution
        const resolutionResult =
          await this.missingArtifactUtils.tryResolveMissingArtifactBlocking(
            params.textDocument.uri,
            params.position,
            'definition', // Use 'definition' as fallback since 'implementation' may not be supported
          );

        if (resolutionResult === 'resolved') {
          symbol = await this.symbolManager.getSymbolAtPosition(
            params.textDocument.uri,
            parserPosition,
            'precise',
          );
        }

        if (!symbol) {
          return [];
        }
      }

      this.logger.debug(
        () =>
          `Found symbol: ${symbol.name} (${symbol.kind}) for implementation lookup`,
      );

      // Get implementation locations based on symbol type
      const locations = await this.getImplementationLocations(symbol);

      this.logger.debug(
        () =>
          `Returning ${locations.length} implementation locations for: ${symbol.name}`,
      );

      return locations;
    } catch (error) {
      this.logger.error(
        () => `Error processing implementation request: ${error}`,
      );
      return [];
    }
  }

  /**
   * Whether the cursor lands on the symbol's own declaration identifier.
   *
   * The 'scope' position strategy returns the enclosing symbol for any cursor
   * inside its scope body (matching on symbolRange), so this narrows that to
   * the symbol's identifierRange — the precise declaration name — guarding the
   * scope fallback against non-identifier cursors (whitespace/keyword/body).
   * A symbol without an identifierRange is treated as not matching.
   */
  private isCursorOnDeclarationIdentifier(
    symbol: ApexSymbol,
    position: { line: number; character: number },
  ): boolean {
    if (!symbol.location?.identifierRange) {
      return false;
    }
    return isPositionWithinLocation(symbol.location, position);
  }

  /**
   * Get implementation locations for a symbol
   * For interfaces: returns all classes that implement the interface
   * For abstract methods: returns all methods that implement the abstract method
   */
  private async getImplementationLocations(
    symbol: ApexSymbol,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Abstract method declarations are stored as Block symbols (scopeType='method') by the parser.
      // Resolve them to the corresponding MethodSymbol which carries the correct modifiers.
      let resolvedSymbol = symbol;
      if (
        symbol.kind === SymbolKind.Block &&
        (symbol as any).scopeType === 'method' &&
        symbol.fileUri
      ) {
        const fileSymbols = await this.symbolManager.findSymbolsInFile(
          symbol.fileUri,
        );
        const methodSymbol = fileSymbols.find(
          (s) => isMethodSymbol(s) && s.name === symbol.name,
        );
        if (methodSymbol) {
          resolvedSymbol = methodSymbol;
        }
      }

      // Case 1: Interface - find all classes that implement it
      if (resolvedSymbol.kind === SymbolKind.Interface) {
        const interfaceSymbol = resolvedSymbol as TypeSymbol;
        const implementingClasses =
          await this.findImplementingClasses(interfaceSymbol);

        for (const classSymbol of implementingClasses) {
          const location = await this.createLocationFromSymbol(classSymbol);
          if (location) {
            locations.push(location);
          }
        }
      }
      // Case 2: Abstract or virtual method - find all methods that implement/override it
      else if (
        isMethodSymbol(resolvedSymbol) &&
        (resolvedSymbol.modifiers?.isAbstract ||
          resolvedSymbol.modifiers?.isVirtual)
      ) {
        const abstractMethod = resolvedSymbol as MethodSymbol;

        // If the method belongs to an interface, find all implementing classes
        // (classes that implement the interface and provide this method)
        const containingType =
          await this.symbolManager.getContainingType(abstractMethod);
        this.logger.debug(
          () =>
            `[impl] containingType for ${abstractMethod.name}: ` +
            `${containingType ? `${containingType.name} (${containingType.kind})` : 'null'}`,
        );

        if (containingType && containingType.kind === SymbolKind.Interface) {
          const interfaceSymbol = containingType as TypeSymbol;
          const implementingClasses =
            await this.findImplementingClasses(interfaceSymbol);
          this.logger.debug(
            () =>
              `[impl] interface method path: found ${implementingClasses.length} implementing classes`,
          );
          for (const classSymbol of implementingClasses) {
            // Find the specific method in the implementing class
            const methods = (
              await this.symbolManager.findSymbolsInFile(
                classSymbol.fileUri || '',
              )
            ).filter(
              (s) =>
                isMethodSymbol(s) &&
                s.name === abstractMethod.name &&
                !s.modifiers?.isAbstract,
            );
            for (const method of methods) {
              if (
                isMethodSymbol(method) &&
                this.methodSignaturesMatch(abstractMethod, method)
              ) {
                const location = await this.createLocationFromSymbol(method);
                if (location) {
                  locations.push(location);
                }
              }
            }
          }
        } else {
          const implementingMethods =
            await this.findImplementingMethods(abstractMethod);

          for (const methodSymbol of implementingMethods) {
            const location = await this.createLocationFromSymbol(methodSymbol);
            if (location) {
              locations.push(location);
            }
          }
        }
      }
      // Case 3: Not an interface or abstract method - no implementations
      else {
        this.logger.debug(
          () =>
            `Symbol ${resolvedSymbol.name} (${resolvedSymbol.kind}) is not an ` +
            'interface or abstract method - no implementations',
        );
      }
    } catch (error) {
      this.logger.debug(
        () => `Error getting implementation locations: ${error}`,
      );
    }

    return locations;
  }

  /**
   * Find all classes that implement the given interface, including classes that
   * implement sub-interfaces (interface extending interface) and subclasses of
   * implementors.
   *
   * Delegates to the canonical inheritance API (ISymbolManager.findSubtypes),
   * which walks the maintained INHERITANCE / INTERFACE_IMPLEMENTATION graph edges.
   * The transitive subtype set of an interface is exactly its implementor classes,
   * its sub-interfaces, and their subclasses — so a single call replaces the
   * former interface-hierarchy BFS + `interfaces[]` string matching + full
   * `getAllSymbolsForCompletion()` workspace scan. find-references and
   * go-to-implementation now share one inheritance source of truth.
   */
  private async findImplementingClasses(
    interfaceSymbol: TypeSymbol,
  ): Promise<ApexSymbol[]> {
    const subtypes = await this.symbolManager.findSubtypes(interfaceSymbol);
    return subtypes.filter(
      (s) => s.kind === SymbolKind.Class && inTypeSymbolGroup(s),
    );
  }

  /**
   * Find all methods that implement the given abstract method
   */
  private async findImplementingMethods(
    abstractMethod: MethodSymbol,
  ): Promise<ApexSymbol[]> {
    const implementingMethods: ApexSymbol[] = [];

    try {
      // Get the containing class of the abstract method
      const containingType =
        await this.symbolManager.getContainingType(abstractMethod);
      if (!containingType || !inTypeSymbolGroup(containingType)) {
        return implementingMethods;
      }

      const abstractClass = containingType as TypeSymbol;

      // Find all classes that (transitively) extend this abstract class via the
      // canonical inheritance API, then keep only the class subtypes.
      const extendingClasses = (
        await this.symbolManager.findSubtypes(abstractClass)
      ).filter((s) => s.kind === SymbolKind.Class && inTypeSymbolGroup(s));

      // For each extending class, find methods with the same signature
      for (const extendingClass of extendingClasses) {
        const methods = (
          await this.symbolManager.findSymbolsInFile(
            extendingClass.fileUri || '',
          )
        ).filter(
          (s) =>
            isMethodSymbol(s) &&
            s.name === abstractMethod.name &&
            !s.modifiers?.isAbstract,
        );

        for (const method of methods) {
          if (isMethodSymbol(method)) {
            // Check if method signature matches (same name, same parameters)
            if (this.methodSignaturesMatch(abstractMethod, method)) {
              implementingMethods.push(method);
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error finding implementing methods: ${error}`);
    }

    return implementingMethods;
  }

  /**
   * Check if two method signatures match (same name and parameter types)
   */
  private methodSignaturesMatch(
    method1: MethodSymbol,
    method2: MethodSymbol,
  ): boolean {
    if (method1.name !== method2.name) {
      return false;
    }

    const params1 = (method1 as any).parameters || [];
    const params2 = (method2 as any).parameters || [];

    if (params1.length !== params2.length) {
      return false;
    }

    for (let i = 0; i < params1.length; i++) {
      const type1 = params1[i]?.type?.name || '';
      const type2 = params2[i]?.type?.name || '';
      if (type1.toLowerCase() !== type2.toLowerCase()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create location from symbol
   */
  private async createLocationFromSymbol(
    symbol: ApexSymbol,
  ): Promise<Location | null> {
    if (!symbol.location) {
      this.logger.debug(
        () => `Symbol has no location: ${JSON.stringify(symbol)}`,
      );
      return null;
    }

    const uri = await this.getSymbolFileUri(symbol);
    if (!uri) {
      this.logger.debug(() => `Could not get URI for symbol: ${symbol.name}`);
      return null;
    }

    // Use identifierRange for precise positioning
    if (!symbol.location.identifierRange) {
      this.logger.warn(
        () =>
          `Symbol missing precise positioning (identifierRange) for implementation: ${JSON.stringify(
            symbol.location,
          )}`,
      );
      return null;
    }

    const startLine = symbol.location.identifierRange.startLine;
    const startColumn = symbol.location.identifierRange.startColumn;
    const endLine = symbol.location.identifierRange.endLine;
    const endColumn = symbol.location.identifierRange.endColumn;

    // Validate that we have valid numeric values
    if (
      typeof startLine !== 'number' ||
      typeof startColumn !== 'number' ||
      typeof endLine !== 'number' ||
      typeof endColumn !== 'number'
    ) {
      this.logger.warn(
        () =>
          `Invalid position values: startLine=${startLine}, ` +
          `startColumn=${startColumn}, endLine=${endLine}, endColumn=${endColumn}`,
      );
      return null;
    }

    const range: Range = {
      start: transformParserToLspPosition({
        line: startLine,
        character: startColumn,
      }),
      end: transformParserToLspPosition({
        line: endLine,
        character: endColumn,
      }),
    };

    return { uri, range };
  }

  /**
   * Get the file URI for a symbol
   */
  private async getSymbolFileUri(symbol: ApexSymbol): Promise<string | null> {
    // Try to get from symbol's file URI
    if (symbol.fileUri) {
      return symbol.fileUri;
    }

    // Try to find in symbol manager
    try {
      const files = await this.symbolManager.findFilesForSymbol(symbol.name);
      if (files.length > 0) {
        return files[0];
      }
    } catch (error) {
      this.logger.debug(() => `Error getting symbol file URI: ${error}`);
    }

    return null;
  }
}
