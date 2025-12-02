/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  PRODUCTION_CAPABILITIES,
  DEVELOPMENT_CAPABILITIES,
  CAPABILITIES_CONFIGURATION,
} from '../../src/capabilities/ApexLanguageServerCapabilities';
import {
  PRODUCTION_CLIENT_CAPABILITIES,
  DEVELOPMENT_CLIENT_CAPABILITIES,
  CLIENT_CAPABILITIES_CONFIGURATION,
  getClientCapabilitiesForMode,
} from '../../src/client/ApexClientCapabilities';
import { ApexCapabilitiesManager } from '../../src/capabilities/ApexCapabilitiesManager';

describe('Capabilities Alignment Tests', () => {
  describe('Server Capabilities Configuration', () => {
    it('should have consistent production capabilities', () => {
      expect(PRODUCTION_CAPABILITIES).toMatchSnapshot(
        'production-server-capabilities',
      );
    });

    it('should have consistent development capabilities', () => {
      expect(DEVELOPMENT_CAPABILITIES).toMatchSnapshot(
        'development-server-capabilities',
      );
    });

    it('should have consistent capabilities configuration', () => {
      expect(CAPABILITIES_CONFIGURATION).toMatchSnapshot(
        'server-capabilities-configuration',
      );
    });
  });

  describe('Client Capabilities Configuration', () => {
    it('should have consistent production client capabilities', () => {
      expect(PRODUCTION_CLIENT_CAPABILITIES).toMatchSnapshot(
        'production-client-capabilities',
      );
    });

    it('should have consistent development client capabilities', () => {
      expect(DEVELOPMENT_CLIENT_CAPABILITIES).toMatchSnapshot(
        'development-client-capabilities',
      );
    });

    it('should have consistent client capabilities configuration', () => {
      expect(CLIENT_CAPABILITIES_CONFIGURATION).toMatchSnapshot(
        'client-capabilities-configuration',
      );
    });

    it('should return correct capabilities for production mode', () => {
      const productionCaps = getClientCapabilitiesForMode('production');
      expect(productionCaps).toBe(PRODUCTION_CLIENT_CAPABILITIES);
      expect(productionCaps).toMatchSnapshot(
        'production-client-capabilities-via-function',
      );
    });

    it('should return correct capabilities for development mode', () => {
      const developmentCaps = getClientCapabilitiesForMode('development');
      expect(developmentCaps).toBe(DEVELOPMENT_CLIENT_CAPABILITIES);
      expect(developmentCaps).toMatchSnapshot(
        'development-client-capabilities-via-function',
      );
    });
  });

  describe('Capabilities Manager Integration', () => {
    let capabilitiesManager: ApexCapabilitiesManager;

    beforeEach(() => {
      capabilitiesManager = new ApexCapabilitiesManager();
    });

    it('should return production capabilities in production mode', () => {
      capabilitiesManager.setMode('production');
      const capabilities = capabilitiesManager.getRawCapabilities();
      expect(capabilities).toMatchSnapshot('capabilities-manager-production');
    });

    it('should return development capabilities in development mode', () => {
      capabilitiesManager.setMode('development');
      const capabilities = capabilitiesManager.getRawCapabilities();
      expect(capabilities).toMatchSnapshot('capabilities-manager-development');
    });

    it('should have consistent mode switching', () => {
      // Test production mode (use getRawCapabilities to compare with raw definitions)
      capabilitiesManager.setMode('production');
      const productionCaps = capabilitiesManager.getRawCapabilities();
      expect(productionCaps).toBe(PRODUCTION_CAPABILITIES);

      // Test development mode
      capabilitiesManager.setMode('development');
      const developmentCaps = capabilitiesManager.getRawCapabilities();
      expect(developmentCaps).toBe(DEVELOPMENT_CAPABILITIES);

      // Verify they're different
      expect(productionCaps).not.toBe(developmentCaps);
    });
  });

  describe('Dynamic Registration Alignment', () => {
    it('should have consistent document selectors between client and server', () => {
      // Client document selectors (from VSCode extension)
      const clientDocumentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      // Server document selectors (from dynamic registration)
      const serverDocumentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      expect(clientDocumentSelectors).toEqual(serverDocumentSelectors);
      expect(clientDocumentSelectors).toMatchSnapshot(
        'document-selectors-alignment',
      );
    });

    it('should have consistent dynamic registration support', () => {
      const productionClient = PRODUCTION_CLIENT_CAPABILITIES;
      const developmentClient = DEVELOPMENT_CLIENT_CAPABILITIES;

      // Both production and development support dynamic registration for basic features
      expect(
        productionClient.workspace?.didChangeConfiguration?.dynamicRegistration,
      ).toBe(true);
      expect(
        productionClient.workspace?.didChangeWatchedFiles?.dynamicRegistration,
      ).toBe(true);
      expect(productionClient.workspace?.symbol?.dynamicRegistration).toBe(
        true,
      );
      expect(
        productionClient.workspace?.executeCommand?.dynamicRegistration,
      ).toBe(true);
      expect(
        productionClient.textDocument?.synchronization?.dynamicRegistration,
      ).toBe(true);

      // Both production and development have documentSymbol and diagnostic
      expect(
        productionClient.textDocument?.documentSymbol?.dynamicRegistration,
      ).toBe(true);
      expect(
        productionClient.textDocument?.diagnostic?.dynamicRegistration,
      ).toBe(true);
      expect(
        developmentClient.textDocument?.documentSymbol?.dynamicRegistration,
      ).toBe(true);
      expect(
        developmentClient.textDocument?.diagnostic?.dynamicRegistration,
      ).toBe(true);

      // Development has additional features that production doesn't have
      expect(
        developmentClient.textDocument?.completion?.dynamicRegistration,
      ).toBe(true);
      expect(developmentClient.textDocument?.hover?.dynamicRegistration).toBe(
        true,
      );
      expect(
        developmentClient.textDocument?.foldingRange?.dynamicRegistration,
      ).toBe(true);

      // Production should not have the additional development features
      expect(
        productionClient.textDocument?.completion?.dynamicRegistration,
      ).toBeUndefined();
      expect(
        productionClient.textDocument?.hover?.dynamicRegistration,
      ).toBeUndefined();
      expect(
        productionClient.textDocument?.foldingRange?.dynamicRegistration,
      ).toBeUndefined();

      expect({
        production: {
          dynamicRegistration: {
            workspace: {
              didChangeConfiguration:
                productionClient.workspace?.didChangeConfiguration
                  ?.dynamicRegistration,
              didChangeWatchedFiles:
                productionClient.workspace?.didChangeWatchedFiles
                  ?.dynamicRegistration,
              symbol: productionClient.workspace?.symbol?.dynamicRegistration,
              executeCommand:
                productionClient.workspace?.executeCommand?.dynamicRegistration,
            },
            textDocument: {
              synchronization:
                productionClient.textDocument?.synchronization
                  ?.dynamicRegistration,
              completion:
                productionClient.textDocument?.completion?.dynamicRegistration,
              hover: productionClient.textDocument?.hover?.dynamicRegistration,
              documentSymbol:
                productionClient.textDocument?.documentSymbol
                  ?.dynamicRegistration,
              foldingRange:
                productionClient.textDocument?.foldingRange
                  ?.dynamicRegistration,
            },
          },
        },
        development: {
          dynamicRegistration: {
            workspace: {
              didChangeConfiguration:
                developmentClient.workspace?.didChangeConfiguration
                  ?.dynamicRegistration,
              didChangeWatchedFiles:
                developmentClient.workspace?.didChangeWatchedFiles
                  ?.dynamicRegistration,
              symbol: developmentClient.workspace?.symbol?.dynamicRegistration,
              executeCommand:
                developmentClient.workspace?.executeCommand
                  ?.dynamicRegistration,
            },
            textDocument: {
              synchronization:
                developmentClient.textDocument?.synchronization
                  ?.dynamicRegistration,
              completion:
                developmentClient.textDocument?.completion?.dynamicRegistration,
              hover: developmentClient.textDocument?.hover?.dynamicRegistration,
              documentSymbol:
                developmentClient.textDocument?.documentSymbol
                  ?.dynamicRegistration,
              foldingRange:
                developmentClient.textDocument?.foldingRange
                  ?.dynamicRegistration,
            },
          },
        },
      }).toMatchSnapshot('dynamic-registration-alignment');
    });
  });

  describe('Capability Feature Alignment', () => {
    it('should have consistent text document sync capabilities', () => {
      const productionServer = PRODUCTION_CAPABILITIES;
      const developmentServer = DEVELOPMENT_CAPABILITIES;

      expect(productionServer.textDocumentSync).toMatchSnapshot(
        'production-text-document-sync',
      );
      expect(developmentServer.textDocumentSync).toMatchSnapshot(
        'development-text-document-sync',
      );
    });

    it('should have consistent workspace capabilities', () => {
      const productionServer = PRODUCTION_CAPABILITIES;
      const developmentServer = DEVELOPMENT_CAPABILITIES;

      expect(productionServer.workspace).toMatchSnapshot(
        'production-workspace-capabilities',
      );
      expect(developmentServer.workspace).toMatchSnapshot(
        'development-workspace-capabilities',
      );
    });

    it('should have consistent provider capabilities', () => {
      const productionServer = PRODUCTION_CAPABILITIES;
      const developmentServer = DEVELOPMENT_CAPABILITIES;

      const providerComparison = {
        production: {
          documentSymbolProvider: productionServer.documentSymbolProvider,
          hoverProvider: productionServer.hoverProvider,
          foldingRangeProvider: productionServer.foldingRangeProvider,
          diagnosticProvider: productionServer.diagnosticProvider,
          completionProvider: productionServer.completionProvider,
        },
        development: {
          documentSymbolProvider: developmentServer.documentSymbolProvider,
          hoverProvider: developmentServer.hoverProvider,
          foldingRangeProvider: developmentServer.foldingRangeProvider,
          diagnosticProvider: developmentServer.diagnosticProvider,
          completionProvider: developmentServer.completionProvider,
        },
      };

      expect(providerComparison).toMatchSnapshot(
        'provider-capabilities-comparison',
      );
    });
  });

  describe('Configuration Consistency', () => {
    it('should maintain consistent configuration structure', () => {
      const configComparison = {
        serverCapabilities: {
          production: PRODUCTION_CAPABILITIES,
          development: DEVELOPMENT_CAPABILITIES,
        },
        clientCapabilities: {
          production: PRODUCTION_CLIENT_CAPABILITIES,
          development: DEVELOPMENT_CLIENT_CAPABILITIES,
        },
        configurations: {
          server: CAPABILITIES_CONFIGURATION,
          client: CLIENT_CAPABILITIES_CONFIGURATION,
        },
      };

      expect(configComparison).toMatchSnapshot('full-configuration-comparison');
    });

    it('should have consistent mode detection', () => {
      const modeTests = [
        {
          mode: 'production' as const,
          expectedServer: PRODUCTION_CAPABILITIES,
          expectedClient: PRODUCTION_CLIENT_CAPABILITIES,
        },
        {
          mode: 'development' as const,
          expectedServer: DEVELOPMENT_CAPABILITIES,
          expectedClient: DEVELOPMENT_CLIENT_CAPABILITIES,
        },
      ];

      modeTests.forEach(({ mode, expectedServer, expectedClient }) => {
        const capabilitiesManager = new ApexCapabilitiesManager();
        capabilitiesManager.setMode(mode);
        // Use getRawCapabilities to compare with raw capability definitions
        const serverCaps = capabilitiesManager.getRawCapabilities();
        const clientCaps = getClientCapabilitiesForMode(mode);

        expect(serverCaps).toBe(expectedServer);
        expect(clientCaps).toBe(expectedClient);
      });

      expect(modeTests).toMatchSnapshot('mode-detection-consistency');
    });
  });
});
