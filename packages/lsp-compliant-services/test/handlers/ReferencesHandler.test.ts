/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ReferenceParams, Location } from 'vscode-languageserver-protocol';
import { getLogger, LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ReferencesHandler } from '../../src/handlers/ReferencesHandler';
import { IReferencesProcessor } from '../../src/services/ReferencesProcessingService';

// Mock the references processor
const mockReferencesProcessor: jest.Mocked<IReferencesProcessor> = {
  processReferences: jest.fn(),
};

describe('ReferencesHandler', () => {
  let handler: ReferencesHandler;
  let logger: LoggerInterface;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create handler instance
    handler = new ReferencesHandler(logger, mockReferencesProcessor);
  });

  describe('handleReferences', () => {
    it('should return reference locations for valid request', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const mockLocations: Location[] = [
        {
          uri: 'file:///test/TestClass.cls',
          range: {
            start: { line: 5, character: 10 },
            end: { line: 5, character: 20 },
          },
        },
        {
          uri: 'file:///test/AnotherClass.cls',
          range: {
            start: { line: 10, character: 5 },
            end: { line: 10, character: 15 },
          },
        },
      ];

      mockReferencesProcessor.processReferences.mockResolvedValue(
        mockLocations,
      );

      // Act
      const result = await handler.handleReferences(params);

      // Assert
      expect(result).toEqual(mockLocations);
      expect(mockReferencesProcessor.processReferences).toHaveBeenCalledWith(
        params,
      );
      expect(mockReferencesProcessor.processReferences).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should return empty array when no references found', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockReferencesProcessor.processReferences.mockResolvedValue([]);

      // Act
      const result = await handler.handleReferences(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockReferencesProcessor.processReferences).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle processor errors gracefully', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const error = new Error('Processor error');
      mockReferencesProcessor.processReferences.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleReferences(params)).rejects.toThrow(
        'Processor error',
      );
      expect(mockReferencesProcessor.processReferences).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle null result from processor', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockReferencesProcessor.processReferences.mockResolvedValue(null as any);

      // Act
      const result = await handler.handleReferences(params);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle single location result', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const singleLocation: Location = {
        uri: 'file:///test/TestClass.cls',
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 20 },
        },
      };

      mockReferencesProcessor.processReferences.mockResolvedValue(
        singleLocation as any,
      );

      // Act
      const result = await handler.handleReferences(params);

      // Assert
      expect(result).toEqual([singleLocation]);
    });

    it('should include declaration when includeDeclaration is true', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: {
          includeDeclaration: true,
        },
      };

      const mockLocations: Location[] = [
        {
          uri: 'file:///test/TestClass.cls',
          range: {
            start: { line: 5, character: 10 },
            end: { line: 5, character: 20 },
          },
        },
      ];

      mockReferencesProcessor.processReferences.mockResolvedValue(
        mockLocations,
      );

      // Act
      const result = await handler.handleReferences(params);

      // Assert
      expect(result).toEqual(mockLocations);
      expect(mockReferencesProcessor.processReferences).toHaveBeenCalledWith(
        params,
      );
    });

    it('should exclude declaration when includeDeclaration is false', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: {
          includeDeclaration: false,
        },
      };

      const mockLocations: Location[] = [
        {
          uri: 'file:///test/AnotherClass.cls',
          range: {
            start: { line: 10, character: 5 },
            end: { line: 10, character: 15 },
          },
        },
      ];

      mockReferencesProcessor.processReferences.mockResolvedValue(
        mockLocations,
      );

      // Act
      const result = await handler.handleReferences(params);

      // Assert
      expect(result).toEqual(mockLocations);
      expect(mockReferencesProcessor.processReferences).toHaveBeenCalledWith(
        params,
      );
    });
  });
});
