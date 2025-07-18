/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  RESOURCE_PATHS,
  RESOURCE_URIS,
  getSalesforceVersion,
  getStandardApexLibraryFilePath,
  uriToNodePath,
  uriToBrowserUrl,
  joinUri,
} from '../../src/utils/ResourceUtils';

describe('ResourceUtils', () => {
  describe('RESOURCE_PATHS', () => {
    it('should define path constants', () => {
      expect(RESOURCE_PATHS.BASE_RESOURCES_PATH).toBe('/resources');
      expect(RESOURCE_PATHS.STANDARD_APEX_LIBRARY_PATH).toBe('/resources/StandardApexLibrary');
      expect(RESOURCE_PATHS.VERSION_FILE_PATH).toBe('/resources/StandardApexLibrary/.version.json');
    });
  });

  describe('RESOURCE_URIS', () => {
    it('should define URI constants', () => {
      expect(RESOURCE_URIS.BASE_RESOURCES_URI).toBe('apex-resources:/resources');
      expect(RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI).toBe('apex-resources:/resources/StandardApexLibrary');
      expect(RESOURCE_URIS.VERSION_FILE_URI).toBe('apex-resources:/resources/StandardApexLibrary/.version.json');
    });
  });

  describe('getSalesforceVersion', () => {
    it('should throw an error when version file cannot be loaded', () => {
      expect(() => getSalesforceVersion()).toThrow('Salesforce version file not found');
    });
  });

  describe('getStandardApexLibraryFilePath', () => {
    it('should return the path to a file in the StandardApexLibrary', () => {
      expect(getStandardApexLibraryFilePath('System/String.cls')).toBe(
        '/resources/StandardApexLibrary/System/String.cls',
      );
    });
  });

  describe('uriToNodePath', () => {
    it('should convert a URI to a Node.js path without base path', () => {
      expect(uriToNodePath('apex-resources:/path/to/resource')).toBe('/path/to/resource');
    });

    it('should convert a URI to a Node.js path with base path', () => {
      expect(uriToNodePath('apex-resources:/path/to/resource', '/base/dir')).toBe('/base/dir/path/to/resource');
    });

    it('should throw an error for invalid URIs', () => {
      expect(() => uriToNodePath('invalid-uri')).toThrow('Invalid apex-resources URI');
    });
  });

  describe('uriToBrowserUrl', () => {
    it('should convert a URI to a browser URL without base URL', () => {
      expect(uriToBrowserUrl('apex-resources:/path/to/resource')).toBe('/path/to/resource');
    });

    it('should convert a URI to a browser URL with base URL', () => {
      expect(uriToBrowserUrl('apex-resources:/path/to/resource', 'https://example.com')).toBe(
        'https://example.com/path/to/resource',
      );
    });

    it('should throw an error for invalid URIs', () => {
      expect(() => uriToBrowserUrl('invalid-uri')).toThrow('Invalid apex-resources URI');
    });
  });

  describe('joinUri', () => {
    it('should join a base URI with a relative path', () => {
      expect(joinUri('apex-resources:/base/path', 'relative/path')).toBe('apex-resources:/base/path/relative/path');
    });

    it('should handle base URIs with trailing slashes', () => {
      expect(joinUri('apex-resources:/base/path/', 'relative/path')).toBe('apex-resources:/base/path/relative/path');
    });

    it('should handle relative paths with leading slashes', () => {
      expect(joinUri('apex-resources:/base/path', '/relative/path')).toBe('apex-resources:/base/path/relative/path');
    });

    it('should throw an error for invalid URIs', () => {
      expect(() => joinUri('invalid-uri', 'relative/path')).toThrow('Invalid apex-resources URI');
    });
  });
});
