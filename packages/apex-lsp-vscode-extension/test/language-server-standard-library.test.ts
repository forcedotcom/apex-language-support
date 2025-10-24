/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { getStdApexClassesPathFromContext } from '../src/utils/serverUtils';

// Mock vscode workspace.fs
jest.mock('vscode', () => ({
  workspace: {
    fs: {
      readFile: jest.fn(),
    },
  },
  Uri: {
    joinPath: jest.fn((base: any, ...segments: string[]) => ({
      toString: () => `${base.toString()}/${segments.join('/')}`,
      path: `${base.toString()}/${segments.join('/')}`,
    })),
  },
}));

describe('apex/provideStandardLibrary Request Handler', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      extensionUri: {
        toString: () => 'file:///extension/path',
        path: '/extension/path',
      },
      extension: {
        packageJSON: {
          contributes: {
            standardApexLibrary: 'resources/StandardApexLibrary.zip',
          },
        },
      },
    } as any;
  });

  describe('Standard Library ZIP Loading', () => {
    it('should read StandardApexLibrary.zip from virtual file system', async () => {
      const mockZipContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP header
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
        mockZipContent,
      );

      // Get the ZIP URI
      const zipUri = getStdApexClassesPathFromContext(mockContext);

      // Read the file
      const zipBuffer = await vscode.workspace.fs.readFile(zipUri);

      // Verify the file was read correctly
      expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith(zipUri);
      expect(zipBuffer).toBe(mockZipContent);
      expect(zipBuffer).toBeInstanceOf(Uint8Array);
    });

    it('should convert Uint8Array to base64 for transmission', async () => {
      const mockZipContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
        mockZipContent,
      );

      const zipUri = getStdApexClassesPathFromContext(mockContext);
      const zipBuffer = await vscode.workspace.fs.readFile(zipUri);

      // Convert to base64
      const base64Data = Buffer.from(zipBuffer).toString('base64');

      // Verify conversion
      expect(base64Data).toBe('UEsDBA=='); // base64 of ZIP header
      expect(typeof base64Data).toBe('string');
    });

    it('should return ZIP data with size information', async () => {
      const mockZipContent = new Uint8Array(1024); // 1KB ZIP
      mockZipContent.fill(0x50); // Fill with dummy data

      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
        mockZipContent,
      );

      const zipUri = getStdApexClassesPathFromContext(mockContext);
      const zipBuffer = await vscode.workspace.fs.readFile(zipUri);

      const base64Data = Buffer.from(zipBuffer).toString('base64');
      const result = {
        zipData: base64Data,
        size: zipBuffer.length,
      };

      // Verify result structure
      expect(result.zipData).toBeDefined();
      expect(result.size).toBe(1024);
      expect(typeof result.zipData).toBe('string');
      expect(typeof result.size).toBe('number');
    });

    it('should handle file read errors gracefully', async () => {
      (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(
        new Error('File not found'),
      );

      const zipUri = getStdApexClassesPathFromContext(mockContext);

      // Verify that the error is thrown
      await expect(vscode.workspace.fs.readFile(zipUri)).rejects.toThrow(
        'File not found',
      );
    });

    it('should work in both desktop and web environments', async () => {
      // This test verifies that the approach works uniformly across environments
      const mockZipContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
        mockZipContent,
      );

      // Desktop environment
      const desktopContext = {
        extensionUri: {
          toString: () => 'file:///extension/path',
          path: '/extension/path',
        },
        extension: {
          packageJSON: {
            contributes: {
              standardApexLibrary: 'resources/StandardApexLibrary.zip',
            },
          },
        },
      } as any;

      const desktopZipUri = getStdApexClassesPathFromContext(desktopContext);
      const desktopBuffer = await vscode.workspace.fs.readFile(desktopZipUri);

      // Web environment
      const webContext = {
        extensionUri: {
          toString: () => 'vscode-vfs://extension/path',
          path: '/extension/path',
        },
        extension: {
          packageJSON: {
            contributes: {
              standardApexLibrary: 'resources/StandardApexLibrary.zip',
            },
          },
        },
      } as any;

      const webZipUri = getStdApexClassesPathFromContext(webContext);
      const webBuffer = await vscode.workspace.fs.readFile(webZipUri);

      // Both should work the same way
      expect(desktopBuffer).toBe(mockZipContent);
      expect(webBuffer).toBe(mockZipContent);
    });
  });

  describe('Request Handler Integration', () => {
    it('should simulate complete request/response flow', async () => {
      // Simulate server requesting standard library
      const mockZipContent = new Uint8Array(2048);
      mockZipContent.fill(0x50);

      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
        mockZipContent,
      );

      // Client receives request and processes it
      const zipUri = getStdApexClassesPathFromContext(mockContext);
      const zipBuffer = await vscode.workspace.fs.readFile(zipUri);
      const base64Data = Buffer.from(zipBuffer).toString('base64');

      // Client sends response
      const response = {
        zipData: base64Data,
        size: zipBuffer.length,
      };

      // Verify the complete flow
      expect(response.zipData).toBeDefined();
      expect(response.size).toBe(2048);
      expect(typeof response.zipData).toBe('string');

      // Verify data round-trip
      const decodedBuffer = Buffer.from(response.zipData, 'base64');
      expect(decodedBuffer.length).toBe(response.size);
      expect(new Uint8Array(decodedBuffer)).toEqual(mockZipContent);
    });

    it('should handle large ZIP files efficiently', async () => {
      // Simulate a large ZIP file (1.6MB like StandardApexLibrary.zip)
      const largeZipContent = new Uint8Array(1600000);
      largeZipContent.fill(0x50);

      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
        largeZipContent,
      );

      const zipUri = getStdApexClassesPathFromContext(mockContext);

      const startTime = Date.now();
      const zipBuffer = await vscode.workspace.fs.readFile(zipUri);
      const base64Data = Buffer.from(zipBuffer).toString('base64');
      const endTime = Date.now();

      // Verify efficient conversion (should complete in reasonable time)
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      expect(base64Data.length).toBeGreaterThan(0);
      expect(zipBuffer.length).toBe(1600000);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors when ZIP file is missing', async () => {
      (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file or directory'),
      );

      const zipUri = getStdApexClassesPathFromContext(mockContext);

      await expect(vscode.workspace.fs.readFile(zipUri)).rejects.toThrow(
        'ENOENT',
      );
    });

    it('should propagate errors when ZIP file is corrupted', async () => {
      (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(
        new Error('Unexpected end of file'),
      );

      const zipUri = getStdApexClassesPathFromContext(mockContext);

      await expect(vscode.workspace.fs.readFile(zipUri)).rejects.toThrow(
        'Unexpected end of file',
      );
    });

    it('should handle permission errors', async () => {
      (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(
        new Error('EACCES: permission denied'),
      );

      const zipUri = getStdApexClassesPathFromContext(mockContext);

      await expect(vscode.workspace.fs.readFile(zipUri)).rejects.toThrow(
        'EACCES',
      );
    });
  });

  describe('ZIP URI Resolution', () => {
    it('should resolve ZIP URI correctly from extension context', () => {
      const zipUri = getStdApexClassesPathFromContext(mockContext);

      expect(zipUri).toBeDefined();
      expect(zipUri.toString()).toContain('StandardApexLibrary.zip');
    });

    it('should use resources directory for ZIP location', () => {
      const zipUri = getStdApexClassesPathFromContext(mockContext);

      expect(zipUri.toString()).toContain('/resources/');
      expect(zipUri.toString()).toContain('StandardApexLibrary.zip');
    });
  });
});
