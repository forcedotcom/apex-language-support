/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbol } from '../../types/symbol';
import { SymbolResolutionContext } from '../../types/ISymbolManager';

/**
 * LSP request types that require position-based resolution
 */
export type LSPRequestType =
  | 'hover'
  | 'definition'
  | 'references'
  | 'completion';

/**
 * Position information for resolution requests
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * Resolution request with type and position information
 */
export interface ResolutionRequest {
  type: LSPRequestType;
  position: Position;
}

/**
 * Resolution strategy interface
 */
export interface ResolutionStrategy {
  canResolve: (request: ResolutionRequest) => boolean;
  resolve: (
    request: ResolutionRequest,
    context: SymbolResolutionContext,
  ) => Promise<ResolutionResult>;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Result of a resolution attempt
 */
export interface ResolutionResult {
  success: boolean;
  symbol?: ApexSymbol;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
  strategy: string;
  fallbackUsed: boolean;
}

/**
 * Enhanced resolution context with request type information
 */
export interface EnhancedResolutionContext extends SymbolResolutionContext {
  requestType?: LSPRequestType;
  position?: Position;
}
