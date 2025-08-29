import {
  canResolvePositionBasedRequest,
  resolveSymbolAtPosition,
} from '../../../src/symbols/resolution/positionBasedResolution';
import { SymbolResolutionContext } from '../../../src/types/ISymbolManager';
import { ApexSymbol } from '../../../src/types/symbol';

describe('Position-Based Resolution Strategy', () => {
  let mockContext: SymbolResolutionContext;
  let mockSymbol: ApexSymbol;

  beforeEach(() => {
    mockContext = {
      sourceFile: 'test.cls',
      namespaceContext: 'test',
      currentScope: 'class',
      imports: [],
      usingStatements: [],
      currentClass: 'TestClass',
      currentMethod: 'testMethod',
    } as SymbolResolutionContext;
    mockSymbol = {
      name: 'testSymbol',
      type: 'class',
      qname: 'test.testSymbol',
      position: { line: 10, column: 5 },
    } as ApexSymbol;
  });

  describe('canResolvePositionBasedRequest', () => {
    it('should return true for position-based resolution requests', () => {
      const request = { type: 'hover', position: { line: 10, column: 5 } };
      expect(canResolvePositionBasedRequest(request)).toBe(true);
    });

    it('should return true for definition requests', () => {
      const request = {
        type: 'definition',
        position: { line: 10, column: 5 },
      };
      expect(canResolvePositionBasedRequest(request)).toBe(true);
    });

    it('should return true for references requests', () => {
      const request = {
        type: 'references',
        position: { line: 10, column: 5 },
      };
      expect(canResolvePositionBasedRequest(request)).toBe(true);
    });

    it('should return false for non-position-based requests', () => {
      const request = {
        type: 'completion',
        position: { line: 10, column: 5 },
      };
      expect(canResolvePositionBasedRequest(request)).toBe(false);
    });
  });

  describe('resolveSymbolAtPosition', () => {
    it('should resolve symbol at exact position', async () => {
      const request = { type: 'hover', position: { line: 10, column: 5 } };
      const result = await resolveSymbolAtPosition(request, mockContext);

      expect(result.success).toBe(true);
      expect(result.symbol).toBeDefined();
      expect(result.confidence).toBe('exact');
    });

    it('should return no match when no symbol at position', async () => {
      const request = { type: 'hover', position: { line: 999, column: 999 } };
      const result = await resolveSymbolAtPosition(request, mockContext);

      expect(result.success).toBe(false);
      expect(result.symbol).toBeUndefined();
      expect(result.confidence).toBe('none');
    });

    it('should handle ambiguous symbols with context', async () => {
      const request = { type: 'hover', position: { line: 10, column: 5 } };
      const ambiguousContext = { ...mockContext, currentScope: 'method' };
      const result = await resolveSymbolAtPosition(request, ambiguousContext);

      expect(result.success).toBe(true);
      expect(result.confidence).toBe('high');
    });
  });
});
