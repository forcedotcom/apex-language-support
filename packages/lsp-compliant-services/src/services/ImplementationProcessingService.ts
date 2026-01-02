/*
 * Copyright (c) 2025, salesforce.com, inc.
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
export class ImplementationProcessingService
  implements IImplementationProcessor
{
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
      const references = this.symbolManager.getReferencesAtPosition(
        params.textDocument.uri,
        parserPosition,
      );

      // If no TypeReference exists, there's nothing of interest
      if (!references || references.length === 0) {
        this.logger.debug(() => {
          const parserPos = `${parserPosition.line}:${parserPosition.character}`;
          return `No TypeReference at parser position ${parserPos} - nothing of interest`;
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
      this.logger.error(() => `Error processing implementation request: ${error}`);
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
      // Case 1: Interface - find all classes that implement it
      if (symbol.kind === SymbolKind.Interface) {
        const interfaceSymbol = symbol as TypeSymbol;
        const implementingClasses = this.findImplementingClasses(interfaceSymbol);
        
        for (const classSymbol of implementingClasses) {
          const location = this.createLocationFromSymbol(classSymbol);
          if (location) {
            locations.push(location);
          }
        }
      }
      // Case 2: Abstract method - find all methods that implement it
      else if (isMethodSymbol(symbol) && symbol.modifiers?.isAbstract) {
        const abstractMethod = symbol as MethodSymbol;
        const implementingMethods = await this.findImplementingMethods(abstractMethod);
        
        for (const methodSymbol of implementingMethods) {
          const location = this.createLocationFromSymbol(methodSymbol);
          if (location) {
            locations.push(location);
          }
        }
      }
      // Case 3: Not an interface or abstract method - no implementations
      else {
        this.logger.debug(
          () =>
            `Symbol ${symbol.name} (${symbol.kind}) is not an interface or abstract method - no implementations`,
        );
      }
    } catch (error) {
      this.logger.debug(() => `Error getting implementation locations: ${error}`);
    }

    return locations;
  }

  /**
   * Find all classes that implement the given interface
   */
  private findImplementingClasses(interfaceSymbol: TypeSymbol): ApexSymbol[] {
    const implementingClasses: ApexSymbol[] = [];

    try {
      // Find all references to this interface
      const references = this.symbolManager.findReferencesTo(interfaceSymbol);

      // Filter to only classes that implement this interface
      for (const ref of references) {
        const sourceSymbol = ref.symbol;

        // Check if it's a class that implements this interface
        if (
          sourceSymbol.kind === SymbolKind.Class &&
          inTypeSymbolGroup(sourceSymbol)
        ) {
          const classSymbol = sourceSymbol as TypeSymbol;
          const interfaceName = interfaceSymbol.name;

          // Check if this class implements the interface
          if (
            classSymbol.interfaces &&
            classSymbol.interfaces.some(
              (iface) => iface.toLowerCase() === interfaceName.toLowerCase(),
            )
          ) {
            implementingClasses.push(classSymbol);
          }
        }
      }

      // Also search all classes to find ones that implement this interface
      // This catches classes that might not have references yet
      const allSymbols = this.symbolManager.getAllSymbolsForCompletion();
      const allClasses = allSymbols.filter(
        (s) => s.kind === SymbolKind.Class && inTypeSymbolGroup(s),
      ) as TypeSymbol[];

      for (const classSymbol of allClasses) {
        if (
          classSymbol.interfaces &&
          classSymbol.interfaces.some(
            (iface) =>
              iface.toLowerCase() === interfaceSymbol.name.toLowerCase(),
          )
        ) {
          // Avoid duplicates
          if (
            !implementingClasses.some(
              (c) =>
                c.fileUri === classSymbol.fileUri &&
                c.name === classSymbol.name,
            )
          ) {
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
   * Find all methods that implement the given abstract method
   */
  private async findImplementingMethods(
    abstractMethod: MethodSymbol,
  ): Promise<ApexSymbol[]> {
    const implementingMethods: ApexSymbol[] = [];

    try {
      // Get the containing class of the abstract method
      const containingType = this.symbolManager.getContainingType(abstractMethod);
      if (!containingType || !inTypeSymbolGroup(containingType)) {
        return implementingMethods;
      }

      const abstractClass = containingType as TypeSymbol;

      // Find all classes that extend this abstract class
      const extendingClasses = this.findExtendingClasses(abstractClass);

      // For each extending class, find methods with the same signature
      for (const extendingClass of extendingClasses) {
        const methods = this.symbolManager
          .findSymbolsInFile(extendingClass.fileUri || '')
          .filter(
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
   * Find all classes that extend the given class
   */
  private findExtendingClasses(baseClass: TypeSymbol): ApexSymbol[] {
    const extendingClasses: ApexSymbol[] = [];

    try {
      // Find all references to this class
      const references = this.symbolManager.findReferencesTo(baseClass);

      // Filter to only classes that extend this class
      for (const ref of references) {
        const sourceSymbol = ref.symbol;

        if (
          sourceSymbol.kind === SymbolKind.Class &&
          inTypeSymbolGroup(sourceSymbol)
        ) {
          const classSymbol = sourceSymbol as TypeSymbol;
          const baseClassName = baseClass.name;

          // Check if this class extends the base class
          if (
            classSymbol.superClass &&
            classSymbol.superClass.toLowerCase() === baseClassName.toLowerCase()
          ) {
            extendingClasses.push(classSymbol);
          }
        }
      }

      // Also search all classes to find ones that extend this class
      // This catches classes that might not have references yet
      const allSymbols = this.symbolManager.getAllSymbolsForCompletion();
      const allClasses = allSymbols.filter(
        (s) => s.kind === SymbolKind.Class && inTypeSymbolGroup(s),
      ) as TypeSymbol[];

      for (const classSymbol of allClasses) {
        if (
          classSymbol.superClass &&
          classSymbol.superClass.toLowerCase() === baseClass.name.toLowerCase()
        ) {
          // Avoid duplicates
          if (
            !extendingClasses.some(
              (c) =>
                c.fileUri === classSymbol.fileUri &&
                c.name === classSymbol.name,
            )
          ) {
            extendingClasses.push(classSymbol);
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error finding extending classes: ${error}`);
    }

    return extendingClasses;
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
  private createLocationFromSymbol(symbol: ApexSymbol): Location | null {
    if (!symbol.location) {
      this.logger.debug(
        () => `Symbol has no location: ${JSON.stringify(symbol)}`,
      );
      return null;
    }

    const uri = this.getSymbolFileUri(symbol);
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
  private getSymbolFileUri(symbol: ApexSymbol): string | null {
    // Try to get from symbol's file URI
    if (symbol.fileUri) {
      return symbol.fileUri;
    }

    // Try to find in symbol manager
    try {
      const files = this.symbolManager.findFilesForSymbol(symbol.name);
      if (files.length > 0) {
        return files[0];
      }
    } catch (error) {
      this.logger.debug(() => `Error getting symbol file URI: ${error}`);
    }

    return null;
  }
}

