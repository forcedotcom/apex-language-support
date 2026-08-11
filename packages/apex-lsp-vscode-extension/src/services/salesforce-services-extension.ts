/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SalesforceVSCodeServicesApi } from '@salesforce/vscode-services';
import * as vscode from 'vscode';

export const SALESFORCE_SERVICES_EXTENSION_ID =
  'salesforce.salesforcedx-vscode-services';

export const getSalesforceServicesExtension = () =>
  vscode.extensions.getExtension<SalesforceVSCodeServicesApi>(
    SALESFORCE_SERVICES_EXTENSION_ID,
  );

export const isSalesforceServicesAvailable = (): boolean =>
  getSalesforceServicesExtension() !== undefined;

/**
 * Production installs may run without Salesforce Services. Development hosts
 * require it so missing integration wiring is discovered immediately rather
 * than being mistaken for an artifact-resolution failure.
 */
export const requireSalesforceServicesInDevelopment = (
  context: vscode.ExtensionContext,
): void => {
  if (context.extensionMode !== vscode.ExtensionMode.Development) {
    return;
  }

  if (!getSalesforceServicesExtension()) {
    throw new Error(
      `${SALESFORCE_SERVICES_EXTENSION_ID} must be installed and enabled ` +
        'when running the Apex Language Server extension in development mode',
    );
  }
};
