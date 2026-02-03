/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createHash } from 'crypto';

/**
 * Error thrown when MD5 checksum validation fails
 */
export class ChecksumValidationError extends Error {
  constructor(
    public readonly filename: string,
    public readonly expected: string,
    public readonly actual: string,
  ) {
    super(
      `MD5 checksum validation failed for ${filename}.\n` +
        `Expected: ${expected}\n` +
        `Actual: ${actual}\n` +
        "The file may be corrupted or tampered with. Please rebuild the extension with 'npm run build'.",
    );
    this.name = 'ChecksumValidationError';
  }
}

/**
 * Error thrown when MD5 checksum file is missing
 */
export class ChecksumFileMissingError extends Error {
  constructor(public readonly filename: string) {
    super(
      `MD5 checksum file missing for ${filename}.\n` +
        `Expected checksum file: ${filename}.md5\n` +
        "This is a required build artifact. Please rebuild the extension with 'npm run build'.",
    );
    this.name = 'ChecksumFileMissingError';
  }
}

/**
 * Calculate MD5 checksum of a buffer
 *
 * @param data Buffer to calculate checksum for
 * @returns MD5 checksum as hex string
 */
export function calculateMD5(data: Buffer | Uint8Array): string {
  return createHash('md5').update(data).digest('hex');
}

/**
 * Parse MD5 checksum from checksum file content
 *
 * Standard MD5 format: <hash>  <filename>
 *
 * @param checksumContent Content of .md5 file
 * @returns Parsed MD5 hash
 * @throws Error if format is invalid
 */
export function parseMD5ChecksumFile(checksumContent: string): string {
  const trimmed = checksumContent.trim();
  // Format: <hash>  <filename> (two spaces between hash and filename)
  const match = trimmed.match(/^([a-f0-9]{32})\s+(.+)$/i);
  if (!match) {
    throw new Error(
      'Invalid MD5 checksum file format. Expected format: <hash>  <filename>',
    );
  }
  return match[1].toLowerCase();
}

/**
 * Validate MD5 checksum of file data against checksum file content
 *
 * @param filename Name of file being validated (for error messages)
 * @param fileData Buffer containing file data
 * @param checksumFileContent Content of corresponding .md5 file (can be null if missing)
 * @throws ChecksumFileMissingError if checksumFileContent is null/undefined
 * @throws ChecksumValidationError if checksum doesn't match
 */
export function validateMD5Checksum(
  filename: string,
  fileData: Buffer | Uint8Array,
  checksumFileContent: string | null | undefined,
): void {
  if (!checksumFileContent) {
    throw new ChecksumFileMissingError(filename);
  }

  const expectedChecksum = parseMD5ChecksumFile(checksumFileContent);
  const actualChecksum = calculateMD5(fileData);

  if (actualChecksum !== expectedChecksum) {
    throw new ChecksumValidationError(
      filename,
      expectedChecksum,
      actualChecksum,
    );
  }
}

/**
 * Validate MD5 checksum against an explicit expected hash
 *
 * @param filename Name of file being validated (for error messages)
 * @param fileData Buffer containing file data
 * @param expectedChecksum Expected MD5 hash
 * @throws ChecksumValidationError if checksum doesn't match
 */
export function validateMD5ChecksumDirect(
  filename: string,
  fileData: Buffer | Uint8Array,
  expectedChecksum: string,
): void {
  const actualChecksum = calculateMD5(fileData);

  if (actualChecksum !== expectedChecksum.toLowerCase()) {
    throw new ChecksumValidationError(
      filename,
      expectedChecksum,
      actualChecksum,
    );
  }
}
