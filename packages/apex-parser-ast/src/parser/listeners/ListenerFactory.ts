/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BaseApexParserListener } from './BaseApexParserListener';
import { ApexSymbolCollectorListener } from './ApexSymbolCollectorListener';
import { SymbolTable } from '../../types/symbol';
import { DetailLevel } from './LayeredSymbolListenerBase';

/**
 * Factory for creating appropriate listeners based on service needs.
 * Helps services use the minimum listener required for their use case.
 */
export class ListenerFactory {
  /**
   * Create a listener appropriate for the given service type.
   * Most services only need public API symbols for cross-file references.
   *
   * @param serviceType The type of service requesting the listener
   * @param symbolTable Optional existing symbol table to use
   * @returns A listener appropriate for the service's needs
   */
  static createListenerForService(
    serviceType: 'document-open' | 'diagnostic' | 'document-save' | 'full',
    symbolTable?: SymbolTable,
  ): BaseApexParserListener<SymbolTable> {
    switch (serviceType) {
      case 'document-open':
      case 'diagnostic':
      case 'document-save':
        // Use public API only for these services
        // They primarily need symbols for cross-file references (hover, goto definition)
        // Private symbols can be added later via progressive enhancement
        return new ApexSymbolCollectorListener(symbolTable, 'public-api');
      case 'full':
        // Use full listener for services that need all symbols
        // (e.g., code completion, refactoring)
        return new ApexSymbolCollectorListener(symbolTable, 'full');
      default:
        // Default to public API for safety
        return new ApexSymbolCollectorListener(symbolTable, 'public-api');
    }
  }
}
