/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export type IntPair = [number, number];

export interface StructuredVersion {
  // Assuming this is defined elsewhere
}

export interface StructuredVersionRange {
  // Assuming this is defined elsewhere
}

export interface OldVersionProvider {
  // Assuming this is defined elsewhere
}

export interface SourceInfo {
  isTrusted: boolean;
  isFileBased: boolean;
  isMocked: boolean;
  supportsLongTopLevelIdentifier: boolean;
  getVersionProvider(): OldVersionProvider;
  getReferencedPackageVersions(): Map<string, StructuredVersion>;
  getExportedPackageVersions(): Map<IntPair, StructuredVersionRange>;
  getInterfacePackageVersions(): Map<IntPair, Map<string, StructuredVersion>>;
}
