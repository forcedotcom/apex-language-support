/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CodeLensParams, TextDocumentIdentifier } from 'vscode-languageserver';
import { CodeLensProcessingService } from '../../src/services/CodeLensProcessingService';
import { getLogger } from '@salesforce/apex-lsp-shared';

describe('CodeLensProcessingService', () => {
  let service: CodeLensProcessingService;
  const logger = getLogger();

  beforeEach(() => {
    service = new CodeLensProcessingService(logger);
  });

  describe('processCodeLens', () => {
    it('should return code lenses for anonymous apex files', async () => {
      const params: CodeLensParams = {
        textDocument: TextDocumentIdentifier.create(
          'file:///test/example.apex',
        ),
      };

      const result = await service.processCodeLens(params);

      expect(result).toBeDefined();
      expect(result.length).toBe(2); // Execute and Debug commands
      expect(result[0].command?.title).toBe('Execute');
      expect(result[1].command?.title).toBe('Debug');
    });

    it('should return empty array for regular apex files without tests', async () => {
      const params: CodeLensParams = {
        textDocument: TextDocumentIdentifier.create(
          'file:///test/RegularClass.cls',
        ),
      };

      const result = await service.processCodeLens(params);

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const params: CodeLensParams = {
        textDocument: TextDocumentIdentifier.create('invalid://uri'),
      };

      const result = await service.processCodeLens(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('anonymous apex detection', () => {
    it('should detect .apex files as anonymous', async () => {
      const params: CodeLensParams = {
        textDocument: TextDocumentIdentifier.create('file:///test/file.apex'),
      };

      const result = await service.processCodeLens(params);
      expect(result.length).toBe(2);
    });

    it('should not detect .cls files in anonymous directory as anonymous', async () => {
      const params: CodeLensParams = {
        textDocument: TextDocumentIdentifier.create(
          'file:///test/anonymous/file.cls',
        ),
      };

      const result = await service.processCodeLens(params);
      // Should not get anonymous code lenses since it's a .cls file
      expect(result.length).toBe(0);
    });

    it('should not detect regular .cls files as anonymous', async () => {
      const params: CodeLensParams = {
        textDocument: TextDocumentIdentifier.create(
          'file:///test/RegularClass.cls',
        ),
      };

      const result = await service.processCodeLens(params);
      // Should not get anonymous code lenses, will attempt to find test symbols instead
      expect(result.length).toBe(0); // No symbols found for this test
    });
  });
});
