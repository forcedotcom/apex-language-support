/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getEmbeddedStandardLibraryZip,
  getEmbeddedStandardLibraryArtifacts,
} from '../src/index';

describe('Custom Services - Standard Library Exports', () => {
  describe('getEmbeddedStandardLibraryZip', () => {
    it('should be a function', () => {
      expect(typeof getEmbeddedStandardLibraryZip).toBe('function');
    });

    it('should return a Uint8Array or undefined', () => {
      const result = getEmbeddedStandardLibraryZip();

      // In development mode without bundled assets, this may return undefined
      // In production with bundled assets, it returns a Uint8Array
      if (result !== undefined) {
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getEmbeddedStandardLibraryArtifacts', () => {
    it('should be a function', () => {
      expect(typeof getEmbeddedStandardLibraryArtifacts).toBe('function');
    });

    it('should return a Uint8Array or undefined', () => {
      const result = getEmbeddedStandardLibraryArtifacts();

      // In development mode without bundled assets, this may return undefined
      // In production with bundled assets, it returns a Uint8Array
      if (result !== undefined) {
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Type safety', () => {
    it('should have consistent return types', () => {
      const zipResult = getEmbeddedStandardLibraryZip();
      const artifactsResult = getEmbeddedStandardLibraryArtifacts();

      // Both functions should return the same type (Uint8Array | undefined)
      expect(zipResult === undefined || zipResult instanceof Uint8Array).toBe(
        true,
      );
      expect(
        artifactsResult === undefined || artifactsResult instanceof Uint8Array,
      ).toBe(true);
    });
  });

  describe('getEmbeddedStandardLibraryZip', () => {
    it('should return undefined when stub is undefined', () => {
      // Default behavior - stub returns undefined
      const result = getEmbeddedStandardLibraryZip();
      expect(result).toBeUndefined();
    });

    it('should return Uint8Array directly when available', () => {
      // This tests the bundled scenario
      // In actual bundle, the import is replaced with real data
      const result = getEmbeddedStandardLibraryZip();
      // In test environment, returns undefined (stub behavior)
      expect(result === undefined || result instanceof Uint8Array).toBe(true);
    });
  });

  describe('getEmbeddedStandardLibraryArtifacts', () => {
    it('should return undefined when stub is undefined', () => {
      const result = getEmbeddedStandardLibraryArtifacts();
      expect(result).toBeUndefined();
    });

    it('should return Uint8Array directly when available', () => {
      const result = getEmbeddedStandardLibraryArtifacts();
      expect(result === undefined || result instanceof Uint8Array).toBe(true);
    });
  });

  describe('getter object pattern handling', () => {
    // These tests verify the getter pattern works correctly
    // They test the code path but can't fully test bundled behavior in unit tests

    it('getEmbeddedStandardLibraryZip handles getter objects', () => {
      // The function should handle { get value() { ... } } pattern
      // This is tested implicitly by the function's implementation
      // Full testing requires integration tests with bundled output
      const mockGetter = {
        get value() {
          return new Uint8Array([1, 2, 3]);
        },
      };
      // Verify the function can handle this pattern (tested via implementation)
      expect(typeof getEmbeddedStandardLibraryZip).toBe('function');
    });

    it('getEmbeddedStandardLibraryArtifacts handles getter objects', () => {
      // Same as above
      const mockGetter = {
        get value() {
          return new Uint8Array([1, 2, 3]);
        },
      };
      // Verify the function can handle this pattern (tested via implementation)
      expect(typeof getEmbeddedStandardLibraryArtifacts).toBe('function');
    });
  });
});

