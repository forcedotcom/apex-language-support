/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { WorkspaceSymbolParams } from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { WorkspaceSymbolProcessingService } from '../../src/services/WorkspaceSymbolProcessingService';

// Mock ApexSymbolManager
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ApexSymbolManager: jest.fn(),
}));

describe('WorkspaceSymbolProcessingService', () => {
  let service: WorkspaceSymbolProcessingService;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create service instance
    service = new WorkspaceSymbolProcessingService(logger);
  });

  describe('processWorkspaceSymbol', () => {
    it('should return workspace symbols for valid request', async () => {
      // Arrange
      const params: WorkspaceSymbolParams = {
        query: 'testMethod',
      };

      // Act
      const result = await service.processWorkspaceSymbol(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty query', async () => {
      // Arrange
      const params: WorkspaceSymbolParams = {
        query: '',
      };

      // Act
      const result = await service.processWorkspaceSymbol(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params: WorkspaceSymbolParams = {
        query: 'testMethod',
      };

      // Mock ApexSymbolManager to throw error
      const mockSymbolManager = (service as any).symbolManager;
      mockSymbolManager.getAllSymbols = jest.fn().mockImplementation(() => {
        throw new Error('Symbol manager error');
      });

      // Act
      const result = await service.processWorkspaceSymbol(params);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('context analysis', () => {
    it('should extract include patterns correctly', () => {
      // Arrange
      const query = 'testMethod +public -private kind:method rel:inheritance';

      // Act
      const patterns = (service as any).extractIncludePatterns(query);

      // Assert
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns).toContain('public');
    });

    it('should extract exclude patterns correctly', () => {
      // Arrange
      const query = 'testMethod +public -private kind:method rel:inheritance';

      // Act
      const patterns = (service as any).extractExcludePatterns(query);

      // Assert
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns).toContain('private');
    });

    it('should extract symbol kinds correctly', () => {
      // Arrange
      const query = 'testMethod +public -private kind:method rel:inheritance';

      // Act
      const kinds = (service as any).extractSymbolKinds(query);

      // Assert
      expect(Array.isArray(kinds)).toBe(true);
      expect(kinds.length).toBeGreaterThan(0);
    });

    it('should extract relationship types correctly', () => {
      // Arrange
      const query = 'testMethod +public -private kind:method rel:inheritance';

      // Act
      const types = (service as any).extractRelationshipTypes(query);

      // Assert
      expect(Array.isArray(types)).toBe(true);
    });

    it('should map relationship types correctly', () => {
      // Arrange
      const relType = 'method-call';

      // Act
      const mappedType = (service as any).mapToReferenceType(relType);

      // Assert
      expect(mappedType).toBeDefined();
    });

    it('should handle unknown relationship types', () => {
      // Arrange
      const relType = 'unknown-type';

      // Act
      const mappedType = (service as any).mapToReferenceType(relType);

      // Assert
      expect(mappedType).toBeNull();
    });
  });

  describe('symbol matching', () => {
    it('should match name patterns correctly', () => {
      // Arrange
      const name = 'testMethod';
      const pattern = 'test';

      // Act
      const matches = (service as any).matchesNamePattern(name, pattern);

      // Assert
      expect(matches).toBe(true);
    });

    it('should handle exact name matches', () => {
      // Arrange
      const name = 'testMethod';
      const pattern = 'testMethod';

      // Act
      const matches = (service as any).matchesNamePattern(name, pattern);

      // Assert
      expect(matches).toBe(true);
    });

    it('should handle wildcard patterns', () => {
      // Arrange
      const name = 'testMethod';
      const pattern = 'test*';

      // Act
      const matches = (service as any).matchesNamePattern(name, pattern);

      // Assert
      expect(matches).toBe(true);
    });

    it('should handle case insensitive matching', () => {
      // Arrange
      const name = 'TestMethod';
      const pattern = 'testmethod';

      // Act
      const matches = (service as any).matchesNamePattern(name, pattern);

      // Assert
      expect(matches).toBe(true);
    });

    it('should match patterns correctly', () => {
      // Arrange
      const name = 'testMethod';
      const pattern = 'test*';

      // Act
      const matches = (service as any).matchesPattern(name, pattern);

      // Assert
      expect(matches).toBe(true);
    });

    it('should handle case insensitive pattern matching', () => {
      // Arrange
      const name = 'TestMethod';
      const pattern = 'test';

      // Act
      const matches = (service as any).matchesPattern(name, pattern);

      // Assert
      expect(matches).toBe(true);
    });
  });

  describe('symbol kind mapping', () => {
    it('should map class kind correctly', () => {
      // Arrange
      const apexKind = 'class';

      // Act
      const symbolKind = (service as any).mapApexKindToSymbolKind(apexKind);

      // Assert
      expect(symbolKind).toBeDefined();
    });

    it('should map method kind correctly', () => {
      // Arrange
      const apexKind = 'method';

      // Act
      const symbolKind = (service as any).mapApexKindToSymbolKind(apexKind);

      // Assert
      expect(symbolKind).toBeDefined();
    });

    it('should map field kind correctly', () => {
      // Arrange
      const apexKind = 'field';

      // Act
      const symbolKind = (service as any).mapApexKindToSymbolKind(apexKind);

      // Assert
      expect(symbolKind).toBeDefined();
    });

    it('should handle unknown kinds', () => {
      // Arrange
      const apexKind = 'unknown';

      // Act
      const symbolKind = (service as any).mapApexKindToSymbolKind(apexKind);

      // Assert
      expect(symbolKind).toBeDefined();
    });
  });

  describe('relevance calculation', () => {
    it('should calculate relevance for exact matches', () => {
      // Arrange
      const symbol = {
        name: 'testMethod',
        kind: 6, // Method
        containerName: 'TestClass',
      };

      const context = {
        query: 'testMethod',
      };

      // Act
      const relevance = (service as any).calculateSymbolRelevance(
        symbol,
        context,
      );

      // Assert
      expect(typeof relevance).toBe('number');
      expect(relevance).toBeGreaterThan(0.5);
    });

    it('should calculate relevance for partial matches', () => {
      // Arrange
      const symbol = {
        name: 'testMethod',
        kind: 6, // Method
        containerName: 'TestClass',
      };

      const context = {
        query: 'test',
      };

      // Act
      const relevance = (service as any).calculateSymbolRelevance(
        symbol,
        context,
      );

      // Assert
      expect(typeof relevance).toBe('number');
      expect(relevance).toBeGreaterThan(0.5);
    });

    it('should boost relevance for container name matches', () => {
      // Arrange
      const symbol = {
        name: 'testMethod',
        kind: 6, // Method
        containerName: 'TestClass',
      };

      const context = {
        query: 'TestClass',
      };

      // Act
      const relevance = (service as any).calculateSymbolRelevance(
        symbol,
        context,
      );

      // Assert
      expect(typeof relevance).toBe('number');
      expect(relevance).toBeGreaterThan(0.5);
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: WorkspaceSymbolParams = {
        query: 'testMethod',
      };

      const startTime = Date.now();

      // Act
      const result = await service.processWorkspaceSymbol(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
