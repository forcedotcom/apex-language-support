/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  RESOURCE_PATHS,
  DEFAULT_SALESFORCE_VERSION,
  getSalesforceVersion,
  getStandardApexLibraryFilePath,
} from '../../src/utils/ResourceUtils.js';

describe('ResourceUtils', () => {
  describe('RESOURCE_PATHS', () => {
    it('should define path constants', () => {
      expect(RESOURCE_PATHS.BASE_RESOURCES_PATH).toBe('/resources');
      expect(RESOURCE_PATHS.STANDARD_APEX_LIBRARY_PATH).toBe(
        '/resources/StandardApexLibrary',
      );
      expect(RESOURCE_PATHS.VERSION_FILE_PATH).toBe(
        '/resources/StandardApexLibrary/.version.json',
      );
    });
  });

  describe('getSalesforceVersion', () => {
    it('should throw an error when version file cannot be loaded', () => {
      expect(() => getSalesforceVersion()).toThrow(
        'Salesforce version file not found',
      );
    });
  });

  describe('getStandardApexLibraryFilePath', () => {
    it('should return the path to a file in the StandardApexLibrary', () => {
      expect(getStandardApexLibraryFilePath('System/String.cls')).toBe(
        '/resources/StandardApexLibrary/System/String.cls',
      );
    });
  });
});
