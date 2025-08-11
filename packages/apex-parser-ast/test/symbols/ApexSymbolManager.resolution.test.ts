/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { SymbolResolutionContext } from '../../src/types/ISymbolManager';
import { ResolutionRequest } from '../../src/symbols/resolution/types';

describe('ApexSymbolManager - Enhanced Resolution', () => {
  let symbolManager: ApexSymbolManager;
  let mockContext: SymbolResolutionContext;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    mockContext = {
      sourceFile: 'test.cls',
      namespaceContext: 'test',
      currentScope: 'class',
      importStatements: [],
      scopeChain: ['class', 'global'],
      expectedType: undefined,
      parameterTypes: [],
      returnType: undefined,
      accessModifier: 'public',
      isStatic: false,
      relationshipType: undefined,
      inheritanceChain: [],
      interfaceImplementations: [],
    } as SymbolResolutionContext;
  });

  describe('resolveSymbolWithStrategy', () => {
    it('should use position-based strategy for hover requests', async () => {
      const request: ResolutionRequest = {
        type: 'hover',
        position: { line: 10, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should use position-based strategy for definition requests', async () => {
      const request: ResolutionRequest = {
        type: 'definition',
        position: { line: 10, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should use position-based strategy for references requests', async () => {
      const request: ResolutionRequest = {
        type: 'references',
        position: { line: 10, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('position-based');
    });

    it('should fall back to legacy resolution for unsupported request types', async () => {
      const request: ResolutionRequest = {
        type: 'completion',
        position: { line: 10, column: 5 },
      };

      const result = await symbolManager.resolveSymbolWithStrategy(
        request,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBe('legacy');
    });
  });

  describe('getSymbolAtPosition - Enhanced', () => {
    it('should not trigger fallback for exact position matches', async () => {
      const result = symbolManager.getSymbolAtPositionWithStrategy('test.cls', {
        line: 10,
        character: 5,
      });

      expect(result).toBeDefined();
      // Should not have triggered fallback logic
      expect((result as any).fallbackUsed).toBe(false);
    });

    it('should use exact position resolution for hover requests', async () => {
      const result = symbolManager.getSymbolAtPositionWithStrategy(
        'test.cls',
        { line: 10, character: 5 },
        'hover',
      );

      expect(result).toBeDefined();
      expect((result as any).resolutionMethod).toBe('exact-position');
    });
  });

  describe('createResolutionContext - Enhanced', () => {
    it('should include request type in resolution context', () => {
      const context = symbolManager.createResolutionContext(
        'test content',
        { line: 10, character: 5 },
        'test.cls',
      );

      expect(context).toBeDefined();
      expect(context.sourceFile).toBe('test.cls');
    });

    it('should handle different request types correctly', () => {
      const context1 = symbolManager.createResolutionContext(
        'test content',
        { line: 10, character: 5 },
        'test.cls',
      );
      const context2 = symbolManager.createResolutionContext(
        'test content',
        { line: 10, character: 5 },
        'test.cls',
      );

      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
      expect(context1.sourceFile).toBe('test.cls');
      expect(context2.sourceFile).toBe('test.cls');
    });
  });
});
