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
import {
  LoggerInterface,
  LSPConfigurationManager,
  Priority,
} from '@salesforce/apex-lsp-shared';

import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ApexSymbol,
  inTypeSymbolGroup,
  TypeSymbol,
  isMethodSymbol,
  MethodSymbol,
  SymbolKind,
  createQueuedItem,
  offer,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';
import {
  transformLspToParserPosition,
  transformParserToLspPosition,
} from '../utils/positionUtils';

import { MissingArtifactUtils } from '../utils/missingArtifactUtils';
import {
  ensureWorkspaceLoaded,
  isWorkspaceLoaded,
  isWorkspaceLoading,
} from './WorkspaceLoadCoordinator';
import { Effect } from 'effect';

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

  private getConnection() {
    try {
      const connection = LSPConfigurationManager.getInstance().getConnection();
      if (!connection) {
        this.logger.debug(() => 'LSP connection not available');
      }
      return connection;
    } catch {
      return undefined;
    }
  }

  private async queueWorkspaceLoadIfNeeded(): Promise<void> {
    if (isWorkspaceLoaded() || isWorkspaceLoading()) {
      return;
    }
    const connection = this.getConnection();
    if (!connection) {
      return;
    }
    const schedulerService = SchedulerInitializationService.getInstance();
    await schedulerService.ensureInitialized();
    const loadEffect = ensureWorkspaceLoaded(connection, this.logger);
    const queuedItem = await Effect.runPromise(
      createQueuedItem(loadEffect, 'workspace-load'),
    );
    await Effect.runPromise(offer(Priority.Low, queuedItem));
    this.logger.debug(() => '[impl] workspace load task queued');
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
      await this.queueWorkspaceLoadIfNeeded();
    } catch (error) {
      this.logger.debug(
        () => `[impl] workspace load queue error (non-fatal): ${error}`,
      );
    }

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
   * Find all classes that implement the given interface, including classes
   * that implement sub-interfaces (interface extending interface).
   */
  private async findImplementingClasses(
    interfaceSymbol: TypeSymbol,
  ): Promise<ApexSymbol[]> {
    const implementingClasses: ApexSymbol[] = [];
    const seen = new Set<string>();

    try {
      // Collect the full interface hierarchy (the queried interface + all sub-interfaces)
      const allInterfaces =
        await this.collectInterfaceHierarchy(interfaceSymbol);
      const interfaceNames = new Set(
        allInterfaces.map((i) => i.name.toLowerCase()),
      );

      // Find all references and scan all symbols for each interface in the hierarchy
      for (const iface of allInterfaces) {
        const references = await this.symbolManager.findReferencesTo(iface);
        for (const ref of references) {
          const sourceSymbol = ref.symbol;
          if (
            sourceSymbol.kind === SymbolKind.Class &&
            inTypeSymbolGroup(sourceSymbol)
          ) {
            const classSymbol = sourceSymbol as TypeSymbol;
            if (
              classSymbol.interfaces &&
              classSymbol.interfaces.some((name) =>
                interfaceNames.has(name.toLowerCase()),
              )
            ) {
              const key = `${classSymbol.fileUri}::${classSymbol.name}`;
              if (!seen.has(key)) {
                seen.add(key);
                implementingClasses.push(classSymbol);
              }
            }
          }
        }
      }

      // Also scan all classes to catch ones not yet in the reference index
      const allSymbols = await this.symbolManager.getAllSymbolsForCompletion();
      const allClasses = allSymbols.filter(
        (s) => s.kind === SymbolKind.Class && inTypeSymbolGroup(s),
      ) as TypeSymbol[];

      for (const classSymbol of allClasses) {
        if (
          classSymbol.interfaces &&
          classSymbol.interfaces.some((name) =>
            interfaceNames.has(name.toLowerCase()),
          )
        ) {
          const key = `${classSymbol.fileUri}::${classSymbol.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            implementingClasses.push(classSymbol);
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error finding implementing classes: ${error}`);
    }

    return implementingClasses;
  }

  /**
   * Collect an interface and all interfaces that extend it (BFS over interface hierarchy).
   */
  private async collectInterfaceHierarchy(
    rootInterface: TypeSymbol,
  ): Promise<TypeSymbol[]> {
    const result: TypeSymbol[] = [rootInterface];
    const seen = new Set<string>([rootInterface.name.toLowerCase()]);
    const queue: TypeSymbol[] = [rootInterface];

    try {
      const allSymbols = await this.symbolManager.getAllSymbolsForCompletion();
      const allInterfaces = allSymbols.filter(
        (s) => s.kind === SymbolKind.Interface && inTypeSymbolGroup(s),
      ) as TypeSymbol[];

      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const iface of allInterfaces) {
          if (
            iface.interfaces &&
            iface.interfaces.some(
              (name) => name.toLowerCase() === current.name.toLowerCase(),
            )
          ) {
            const key = iface.name.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              result.push(iface);
              queue.push(iface);
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error collecting interface hierarchy: ${error}`);
    }

    return result;
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

      // Find all classes that extend this abstract class
      const extendingClasses = await this.findExtendingClasses(abstractClass);

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
   * Find all classes that extend the given class, traversing the full inheritance hierarchy.
   */
  private async findExtendingClasses(
    baseClass: TypeSymbol,
  ): Promise<ApexSymbol[]> {
    const result: ApexSymbol[] = [];
    const seen = new Set<string>();
    const queue: TypeSymbol[] = [baseClass];

    while (queue.length > 0) {
      const current = queue.shift()!;
      try {
        const direct = await this.findDirectSubclasses(current);
        for (const sub of direct) {
          const key = `${sub.fileUri}::${sub.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push(sub);
            queue.push(sub as TypeSymbol);
          }
        }
      } catch (error) {
        this.logger.debug(() => `Error finding extending classes: ${error}`);
      }
    }

    return result;
  }

  /**
   * Find classes that directly extend the given class (one level only).
   */
  private async findDirectSubclasses(
    baseClass: TypeSymbol,
  ): Promise<TypeSymbol[]> {
    const directSubclasses: TypeSymbol[] = [];

    try {
      const references = await this.symbolManager.findReferencesTo(baseClass);

      for (const ref of references) {
        const sourceSymbol = ref.symbol;
        if (
          sourceSymbol.kind === SymbolKind.Class &&
          inTypeSymbolGroup(sourceSymbol)
        ) {
          const classSymbol = sourceSymbol as TypeSymbol;
          if (
            classSymbol.superClass &&
            classSymbol.superClass.toLowerCase() ===
              baseClass.name.toLowerCase()
          ) {
            directSubclasses.push(classSymbol);
          }
        }
      }

      // Also scan all symbols to catch classes not yet in the reference index
      const allSymbols = await this.symbolManager.getAllSymbolsForCompletion();
      const allClasses = allSymbols.filter(
        (s) => s.kind === SymbolKind.Class && inTypeSymbolGroup(s),
      ) as TypeSymbol[];

      for (const classSymbol of allClasses) {
        if (
          classSymbol.superClass &&
          classSymbol.superClass.toLowerCase() === baseClass.name.toLowerCase()
        ) {
          if (
            !directSubclasses.some(
              (c) =>
                c.fileUri === classSymbol.fileUri &&
                c.name === classSymbol.name,
            )
          ) {
            directSubclasses.push(classSymbol);
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error finding direct subclasses: ${error}`);
    }

    return directSubclasses;
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
