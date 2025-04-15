/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RESOURCE_PATHS } from '../../src/utils/ResourceUtils.js';
import {
  getSalesforceVersionPathNode,
  getSalesforceVersionPathBrowser,
} from '../../src/utils/PlatformUtils.js';

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...paths) => {
    // Properly join paths without duplicating slashes
    return paths.filter(Boolean).join('/');
  }),
  resolve: jest.fn(() => '/mock/current/dir'),
}));

describe('PlatformUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSalesforceVersionPathNode', () => {
    it('should return the path to the Salesforce version file in Node.js', () => {
      const versionPath = getSalesforceVersionPathNode();

      expect(versionPath).toBe(
        '/mock/current/dir/resources/StandardApexLibrary/.version.json',
      );
    });
  });

  describe('getSalesforceVersionPathBrowser', () => {
    it('should return the URL to the Salesforce version file without basePath', () => {
      const versionPath = getSalesforceVersionPathBrowser();

      expect(versionPath).toBe(
        `${RESOURCE_PATHS.STANDARD_APEX_LIBRARY_PATH}/.version.json`,
      );
    });

    it('should return the URL to the Salesforce version file with basePath', () => {
      const basePath = '/custom/path';
      const versionPath = getSalesforceVersionPathBrowser(basePath);

      expect(versionPath).toBe(
        `${basePath}${RESOURCE_PATHS.VERSION_FILE_PATH}`,
      );
    });
  });
});
