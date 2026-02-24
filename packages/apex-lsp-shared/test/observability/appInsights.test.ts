/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from '@jest/globals';
import {
  parseConnectionString,
  isValidConnectionString,
  getInstrumentationKey,
} from '../../src/observability/appInsights';

describe('appInsights', () => {
  describe('parseConnectionString', () => {
    it('parses valid connection string', () => {
      const connectionString =
        'InstrumentationKey=abc123;IngestionEndpoint=https://test.in.applicationinsights.azure.com/';

      const result = parseConnectionString(connectionString);

      expect(result).toEqual({
        instrumentationKey: 'abc123',
        ingestionEndpoint: 'https://test.in.applicationinsights.azure.com/',
      });
    });

    it('parses connection string with all components', () => {
      const connectionString =
        'InstrumentationKey=key123;IngestionEndpoint=https://ing.test.com/;LiveEndpoint=https://live.test.com/';

      const result = parseConnectionString(connectionString);

      expect(result).toEqual({
        instrumentationKey: 'key123',
        ingestionEndpoint: 'https://ing.test.com/',
        liveEndpoint: 'https://live.test.com/',
      });
    });

    it('returns null for empty string', () => {
      expect(parseConnectionString('')).toBeNull();
    });

    it('returns null for missing instrumentation key', () => {
      expect(
        parseConnectionString('IngestionEndpoint=https://test.com/'),
      ).toBeNull();
    });

    it('handles connection string with only instrumentation key', () => {
      const result = parseConnectionString('InstrumentationKey=keyonly');

      expect(result).toEqual({
        instrumentationKey: 'keyonly',
        ingestionEndpoint: undefined,
        liveEndpoint: undefined,
      });
    });
  });

  describe('isValidConnectionString', () => {
    it('returns true for valid connection string', () => {
      expect(isValidConnectionString('InstrumentationKey=valid123')).toBe(true);
    });

    it('returns false for invalid connection string', () => {
      expect(isValidConnectionString('')).toBe(false);
      expect(isValidConnectionString('invalid')).toBe(false);
      expect(
        isValidConnectionString('IngestionEndpoint=https://test.com/'),
      ).toBe(false);
    });
  });

  describe('getInstrumentationKey', () => {
    it('extracts instrumentation key from valid string', () => {
      expect(
        getInstrumentationKey(
          'InstrumentationKey=mykey123;IngestionEndpoint=https://test.com/',
        ),
      ).toBe('mykey123');
    });

    it('returns undefined for invalid string', () => {
      expect(getInstrumentationKey('')).toBeUndefined();
      expect(getInstrumentationKey('invalid')).toBeUndefined();
    });
  });
});
