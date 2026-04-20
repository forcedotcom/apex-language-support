/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  calculateMD5,
  validateMD5ChecksumDirect,
} from '../../src/utils/checksum-validator';
import { hash } from '../../src/utils/utils';

describe('HashingUtils', () => {
  describe('calculateMD5', () => {
    it('should calculate the expected MD5 checksum', () => {
      const data = new TextEncoder().encode('hello');

      expect(calculateMD5(data)).toBe('5d41402abc4b2a76b9719d911017c592');
    });

    it('should validate a matching checksum', () => {
      const data = new TextEncoder().encode('hello');

      expect(() =>
        validateMD5ChecksumDirect(
          'hello.txt',
          data,
          '5d41402abc4b2a76b9719d911017c592',
        ),
      ).not.toThrow();
    });
  });

  describe('hash', () => {
    it('should produce the same hash for the same inputs', () => {
      expect(hash('Version', { major: 1, minor: 2 })).toBe(
        hash('Version', { major: 1, minor: 2 }),
      );
    });

    it('should distinguish different argument boundaries', () => {
      expect(hash('ab', 'c')).not.toBe(hash('a', 'bc'));
    });
  });
});
