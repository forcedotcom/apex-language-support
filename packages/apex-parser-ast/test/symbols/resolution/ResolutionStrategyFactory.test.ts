import {
  selectResolutionStrategy,
  ResolutionRequest,
} from '../../../src/symbols/resolution/strategySelection';
import {
  canResolvePositionBasedRequest,
  resolveSymbolAtPosition,
} from '../../../src/symbols/resolution/positionBasedResolution';

describe('Resolution Strategy Selection', () => {
  describe('selectResolutionStrategy', () => {
    it('should select position-based strategy for hover requests', () => {
      const request: ResolutionRequest = {
        type: 'hover',
        position: { line: 10, column: 5 },
      };

      const strategy = selectResolutionStrategy(request);

      expect(strategy).toBeDefined();
      expect(strategy.canResolve(request)).toBe(true);
      expect(strategy.resolve).toBe(resolveSymbolAtPosition);
    });

    it('should select position-based strategy for definition requests', () => {
      const request: ResolutionRequest = {
        type: 'definition',
        position: { line: 10, column: 5 },
      };

      const strategy = selectResolutionStrategy(request);

      expect(strategy).toBeDefined();
      expect(strategy.canResolve(request)).toBe(true);
    });

    it('should select position-based strategy for references requests', () => {
      const request: ResolutionRequest = {
        type: 'references',
        position: { line: 10, column: 5 },
      };

      const strategy = selectResolutionStrategy(request);

      expect(strategy).toBeDefined();
      expect(strategy.canResolve(request)).toBe(true);
    });

    it('should return undefined for unsupported request types', () => {
      const request: ResolutionRequest = {
        type: 'completion',
        position: { line: 10, column: 5 },
      };

      const strategy = selectResolutionStrategy(request);

      expect(strategy).toBeUndefined();
    });

    it('should handle multiple strategies with priority ordering', () => {
      const request: ResolutionRequest = {
        type: 'hover',
        position: { line: 10, column: 5 },
      };

      const strategy = selectResolutionStrategy(request);

      expect(strategy).toBeDefined();
      expect(strategy.priority).toBe('high');
    });
  });

  describe('ResolutionRequest type', () => {
    it('should accept valid LSP request types', () => {
      const validRequests: ResolutionRequest[] = [
        { type: 'hover', position: { line: 10, column: 5 } },
        { type: 'definition', position: { line: 10, column: 5 } },
        { type: 'references', position: { line: 10, column: 5 } },
        { type: 'completion', position: { line: 10, column: 5 } },
      ];

      validRequests.forEach((request) => {
        expect(request.type).toBeDefined();
        expect(request.position).toBeDefined();
      });
    });
  });
});
