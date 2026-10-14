/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
import * as vscode from 'vscode';
import {
  getSalesforceServicesExtension,
  isSalesforceServicesAvailable,
  SALESFORCE_SERVICES_EXTENSION_ID,
} from '../../src/services/salesforce-services-extension';

describe('Salesforce Services extension discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the published Services API type to discover the extension', () => {
    const extension = { isActive: true } as vscode.Extension<unknown>;
    vi.mocked(vscode.extensions.getExtension).mockReturnValue(extension);

    expect(getSalesforceServicesExtension()).toBe(extension);
    expect(vscode.extensions.getExtension).toHaveBeenCalledWith(
      SALESFORCE_SERVICES_EXTENSION_ID,
    );
    expect(isSalesforceServicesAvailable()).toBe(true);
  });
});
