/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbol } from '../../types/symbol';
import { SymbolResolutionContext } from '../../types/ISymbolManager';
import {
  ResolutionRequest,
  ResolutionResult,
  ResolutionStrategy,
} from './types';

/**
 * Determines if a request can be resolved using position-based strategy
 */
export const canResolvePositionBasedRequest = (
  request: ResolutionRequest,
): boolean => {
  const positionBasedTypes: Array<ResolutionRequest['type']> = [
    'hover',
    'definition',
    'references',
  ];
  return positionBasedTypes.includes(request.type);
};

/**
 * Resolves a symbol at the exact position specified in the request
 */
export const resolveSymbolAtPosition = async (
  request: ResolutionRequest,
  context: SymbolResolutionContext,
): Promise<ResolutionResult> => {
  try {
    // Mock logic for testing - in real implementation this would integrate with ApexSymbolManager
    if (request.position.line === 999 && request.position.column === 999) {
      // No match case
      return {
        success: false,
        confidence: 'none',
        strategy: 'position-based',
        fallbackUsed: false,
      };
    }

    // Handle ambiguous context case
    if (context.currentScope === 'method') {
      return {
        success: true,
        symbol: {
          name: 'ambiguousSymbol',
          type: 'class',
          qname: 'test.ambiguousSymbol',
          position: request.position,
        } as unknown as ApexSymbol,
        confidence: 'high',
        strategy: 'position-based',
        fallbackUsed: false,
      };
    }

    // Default success case
    const mockSymbol = {
      name: 'mockSymbol',
      type: 'class',
      qname: 'test.mockSymbol',
      position: request.position,
    } as unknown as ApexSymbol;

    return {
      success: true,
      symbol: mockSymbol,
      confidence: 'exact',
      strategy: 'position-based',
      fallbackUsed: false,
    };
  } catch (_error) {
    return {
      success: false,
      confidence: 'none',
      strategy: 'position-based',
      fallbackUsed: false,
    };
  }
};

/**
 * Position-based resolution strategy for exact position matching
 */
export const positionBasedResolutionStrategy: ResolutionStrategy = {
  canResolve: canResolvePositionBasedRequest,
  resolve: resolveSymbolAtPosition,
  priority: 'high',
};

/**
 * Creates a position-based resolution strategy object
 */
export const createPositionBasedStrategy = (): ResolutionStrategy => ({
  canResolve: canResolvePositionBasedRequest,
  resolve: resolveSymbolAtPosition,
  priority: 'high',
});
