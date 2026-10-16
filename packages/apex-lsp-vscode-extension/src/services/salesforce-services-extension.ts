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
