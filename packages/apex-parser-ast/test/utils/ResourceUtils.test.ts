/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  APEX_RESOURCES_SCHEME,
  BASE_RESOURCES_URI,
  STANDARD_APEX_LIBRARY_URI,
  VERSION_FILE_URI,
  uriToBrowserUrl,
  joinUri,
  UriUtils,
} from '../../src/utils/ResourceUtils';

describe('ResourceUtils', () => {
  describe('Constants', () => {
    it('should export the correct scheme constant', () => {
      expect(APEX_RESOURCES_SCHEME).toBe('apexlib');
    });

    it('should export the correct base resources URI', () => {
      expect(BASE_RESOURCES_URI).toBe('apexlib://resources');
    });

    it('should export the correct standard apex library URI', () => {
      expect(STANDARD_APEX_LIBRARY_URI).toBe(
        'apexlib://resources/StandardApexLibrary',
      );
    });

    it('should export the correct version file URI', () => {
      expect(VERSION_FILE_URI).toBe(
        'apexlib://resources/StandardApexLibrary/.version.json',
      );
    });
  });

  describe('uriToBrowserUrl', () => {
    it('should convert apexlib URI to browser URL without base URL', () => {
      expect(uriToBrowserUrl('apexlib://resources/path/to/resource')).toBe(
        '/resources/path/to/resource',
      );
    });

    it('should convert apexlib URI to browser URL with base URL', () => {
      expect(
        uriToBrowserUrl(
          'apexlib://resources/path/to/resource',
          'https://example.com',
        ),
      ).toBe('https://example.com/resources/path/to/resource');
    });

    it('should throw error for invalid apexlib URI', () => {
      expect(() => uriToBrowserUrl('invalid://uri')).toThrow(
        'Invalid apexlib URI: invalid://uri',
      );
    });
  });

  describe('joinUri', () => {
    it('should join base URI with relative path', () => {
      expect(joinUri('apexlib://resources/base/path', 'relative/path')).toBe(
        'apexlib://resources/base/path/relative/path',
      );
    });

    it('should handle base URI ending with slash', () => {
      expect(joinUri('apexlib://resources/base/path/', 'relative/path')).toBe(
        'apexlib://resources/base/path/relative/path',
      );
    });

    it('should handle relative path starting with slash', () => {
      expect(joinUri('apexlib://resources/base/path', '/relative/path')).toBe(
        'apexlib://resources/base/path/relative/path',
      );
    });

    it('should throw error for invalid base URI', () => {
      expect(() => joinUri('invalid://uri', 'path')).toThrow(
        'Invalid apexlib URI: invalid://uri',
      );
    });
  });

  describe('UriUtils', () => {
    describe('isApexResourceUri', () => {
      it('should return true for apexlib URIs', () => {
        expect(UriUtils.isApexResourceUri('apexlib://resources/test')).toBe(
          true,
        );
      });

      it('should return false for non-apexlib URIs', () => {
        expect(UriUtils.isApexResourceUri('file:///test')).toBe(false);
        expect(UriUtils.isApexResourceUri('http://example.com')).toBe(false);
      });
    });

    describe('isExternalUri', () => {
      it('should return false for apexlib URIs', () => {
        expect(UriUtils.isExternalUri('apexlib://resources/test')).toBe(false);
      });

      it('should return true for non-apexlib URIs', () => {
        expect(UriUtils.isExternalUri('file:///test')).toBe(true);
        expect(UriUtils.isExternalUri('http://example.com')).toBe(true);
      });
    });

    describe('createResourceUri', () => {
      it('should create correct resource URI', () => {
        expect(UriUtils.createResourceUri('test.cls')).toBe(
          'apexlib://resources/test.cls',
        );
      });
    });

    describe('extractResourcePath', () => {
      it('should extract path from valid apexlib URI', () => {
        expect(
          UriUtils.extractResourcePath(
            'apexlib://resources/StandardApexLibrary/System.cls',
          ),
        ).toBe('StandardApexLibrary/System.cls');
      });

      it('should return null for invalid apexlib URI', () => {
        expect(UriUtils.extractResourcePath('apexlib://invalid')).toBe(null);
      });

      it('should return null for non-apexlib URI', () => {
        expect(UriUtils.extractResourcePath('file:///test')).toBe(null);
      });
    });

    describe('normalizeUri', () => {
      it('should return valid apexlib URI as-is', () => {
        expect(
          UriUtils.normalizeUri(
            'apexlib://resources/StandardApexLibrary/System.cls',
          ),
        ).toBe('apexlib://resources/StandardApexLibrary/System.cls');
      });

      it('should return external URI as-is', () => {
        expect(UriUtils.normalizeUri('file:///test')).toBe('file:///test');
      });

      it('should throw error for invalid apexlib URI format', () => {
        expect(() => UriUtils.normalizeUri('apexlib://invalid')).toThrow(
          'Invalid apexlib URI format: apexlib://invalid',
        );
      });
    });
  });
});
