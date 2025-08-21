/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getSalesforceVersionUri,
  getSalesforceVersionPathBrowser,
} from '../../src/utils/PlatformUtils';

describe('PlatformUtils', () => {
  describe('getSalesforceVersionUri', () => {
    it('should return the URI to the Salesforce version file', () => {
      const versionUri = getSalesforceVersionUri();

      expect(versionUri).toBe(
        'apex-resources:/resources/StandardApexLibrary/.version.json',
      );
    });
  });

  describe('getSalesforceVersionPathBrowser', () => {
    it('should return the URL to the Salesforce version file without basePath', () => {
      const versionPath = getSalesforceVersionPathBrowser();

      expect(versionPath).toBe('/resources/StandardApexLibrary/.version.json');
    });

    it('should return the URL to the Salesforce version file with basePath', () => {
      const basePath = '/custom/path';
      const versionPath = getSalesforceVersionPathBrowser(basePath);

      expect(versionPath).toBe(
        '/custom/path/resources/StandardApexLibrary/.version.json',
      );
    });
  });
});
