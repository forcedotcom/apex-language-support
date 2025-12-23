/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Jest mock for ZIP file imports.
 *
 * In the actual bundle (via esbuild), ZIP files are embedded as base64 data URLs.
 * For tests, we provide a mock data URL with valid ZIP header bytes.
 */

// Mock ZIP data URL with valid ZIP header (PK signature)
// This is base64-encoded: [0x50, 0x4b, 0x03, 0x04] + some padding
const mockZipDataUrl = 'data:application/zip;base64,UEsDBAoAAAAAAA==';

module.exports = mockZipDataUrl;

