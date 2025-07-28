/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  normalizeTraceData,
  denormalizeRequest,
} from '../../src/test-utils/traceDataUtils';

describe('traceDataUtils', () => {
  describe('normalizeTraceData', () => {
    it('should normalize Unix file URIs correctly', () => {
      const testData = {
        '1': {
          type: 'request',
          method: 'initialize',
          params: {
            rootUri: 'file:///Users/peter.hale/git/dreamhouse-lwc',
            rootPath: '/Users/peter.hale/git/dreamhouse-lwc',
          },
        },
        '2': {
          type: 'request',
          method: 'textDocument/documentSymbol',
          params: {
            textDocument: {
              uri: 'file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/PropertyController.cls',
            },
          },
        },
      };

      const normalized = normalizeTraceData(testData);

      expect(normalized['1'].params.rootUri).toBe('file:///workspace');
      expect(normalized['1'].params.rootPath).toBe('/workspace');
      expect(normalized['2'].params.textDocument.uri).toBe(
        'file:///workspace/force-app/main/default/classes/PropertyController.cls',
      );
    });

    it('should normalize Windows file URIs correctly', () => {
      const winPath =
        // eslint-disable-next-line max-len
        'D:\\a\\apex-language-support\\apex-language-support\\packages\\apex-lsp-testbed\\test-artifacts\\dreamhouse-lwc-2025-07-14T15-33-06-356Z';
      const testData = {
        '1': {
          type: 'request',
          method: 'initialize',
          params: {
            rootUri: `file://${winPath}`,
            rootPath: winPath,
          },
        },
        '2': {
          type: 'request',
          method: 'textDocument/documentSymbol',
          params: {
            textDocument: {
              uri: `file://${winPath}\\force-app\\main\\default\\classes\\PropertyController.cls`,
            },
          },
        },
      };

      const normalized = normalizeTraceData(testData);

      expect(normalized['1'].params.rootUri).toBe('file:///workspace');
      expect(normalized['1'].params.rootPath).toBe('/workspace');
      expect(normalized['2'].params.textDocument.uri).toBe(
        'file:///workspace/force-app/main/default/classes/PropertyController.cls',
      );
    });

    it('should handle mixed Unix and Windows URIs', () => {
      const testData = {
        '1': {
          type: 'request',
          method: 'initialize',
          params: {
            rootUri: 'file://D:\\workspace',
            rootPath: 'D:\\workspace',
          },
        },
        '2': {
          type: 'request',
          method: 'textDocument/documentSymbol',
          params: {
            textDocument: {
              uri: 'file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/PropertyController.cls',
            },
          },
        },
      };

      const normalized = normalizeTraceData(testData);

      // The Unix URI should not be normalized since it doesn't match the Windows workspace root
      expect(normalized['2'].params.textDocument.uri).toBe(
        'file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/PropertyController.cls',
      );
    });
  });

  describe('denormalizeRequest', () => {
    it('should denormalize Unix URIs correctly', () => {
      const request = {
        params: {
          textDocument: {
            uri: 'file:///workspace/force-app/main/default/classes/PropertyController.cls',
          },
        },
      };

      const workspaceRootUri =
        // eslint-disable-next-line max-len
        'file:///Users/peter.hale/git/apex-language-support/packages/apex-lsp-testbed/test-artifacts/dreamhouse-lwc-2025-07-14T15-43-23-107Z';

      const denormalized = denormalizeRequest(request, workspaceRootUri);

      expect(denormalized.params.textDocument.uri).toBe(
        // eslint-disable-next-line max-len
        'file:///Users/peter.hale/git/apex-language-support/packages/apex-lsp-testbed/test-artifacts/dreamhouse-lwc-2025-07-14T15-43-23-107Z/force-app/main/default/classes/PropertyController.cls',
      );
    });

    it('should denormalize Windows URIs correctly', () => {
      const request = {
        params: {
          textDocument: {
            uri: 'file:///workspace/force-app/main/default/classes/PropertyController.cls',
          },
        },
      };

      const winPath =
        // eslint-disable-next-line max-len
        'D:\\a\\apex-language-support\\apex-language-support\\packages\\apex-lsp-testbed\\test-artifacts\\dreamhouse-lwc-2025-07-14T15-33-06-356Z';
      const workspaceRootUri = `file://${winPath}`;

      const denormalized = denormalizeRequest(request, workspaceRootUri);

      expect(denormalized.params.textDocument.uri).toBe(
        `file://${winPath}\\force-app/main/default/classes/PropertyController.cls`,
      );
    });
  });
});
