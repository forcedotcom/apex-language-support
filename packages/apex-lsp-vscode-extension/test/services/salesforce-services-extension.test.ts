/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  getSalesforceServicesExtension,
  isSalesforceServicesAvailable,
  requireSalesforceServicesInDevelopment,
  SALESFORCE_SERVICES_EXTENSION_ID,
} from '../../src/services/salesforce-services-extension';

const contextFor = (extensionMode: vscode.ExtensionMode) =>
  ({ extensionMode }) as vscode.ExtensionContext;

describe('Salesforce Services extension discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the published Services API type to discover the extension', () => {
    const extension = { isActive: true } as vscode.Extension<unknown>;
    jest.mocked(vscode.extensions.getExtension).mockReturnValue(extension);

    expect(getSalesforceServicesExtension()).toBe(extension);
    expect(vscode.extensions.getExtension).toHaveBeenCalledWith(
      SALESFORCE_SERVICES_EXTENSION_ID,
    );
    expect(isSalesforceServicesAvailable()).toBe(true);
  });

  it.each([vscode.ExtensionMode.Production, vscode.ExtensionMode.Test])(
    'allows Services to be absent in extension mode %s',
    (extensionMode) => {
      expect(() =>
        requireSalesforceServicesInDevelopment(contextFor(extensionMode)),
      ).not.toThrow();
      expect(vscode.extensions.getExtension).not.toHaveBeenCalled();
    },
  );

  it('requires Services in an Extension Development Host', () => {
    jest.mocked(vscode.extensions.getExtension).mockReturnValue(undefined);

    expect(() =>
      requireSalesforceServicesInDevelopment(
        contextFor(vscode.ExtensionMode.Development),
      ),
    ).toThrow(
      `${SALESFORCE_SERVICES_EXTENSION_ID} must be installed and enabled`,
    );
  });

  it('accepts Services when it is available in development', () => {
    jest
      .mocked(vscode.extensions.getExtension)
      .mockReturnValue({ isActive: false } as vscode.Extension<unknown>);

    expect(() =>
      requireSalesforceServicesInDevelopment(
        contextFor(vscode.ExtensionMode.Development),
      ),
    ).not.toThrow();
  });
});
