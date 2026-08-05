/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared type name extraction utilities for validation.
 * Used by MethodResolutionValidator, TypeResolutionValidator, and
 * MethodCallValidator.
 */

/**
 * Strip generic type params for resolution.
 * "List<GeocodingService.Coordinates>" -> "List"
 * Used when resolving receiver type for method calls (e.g. list.size()).
 */
export function extractBaseTypeForResolution(typeName: string): string {
  return typeName.split('<')[0].trim();
}

/**
 * Extract base type name: strip generics and take last part after dot, lowercase.
 * "List<String>" -> "list", "GeocodingService.Coordinates" -> "coordinates"
 * Used for type name comparison and builtin checks.
 */
export function extractBaseTypeName(typeName: string): string {
  const withoutGenerics = typeName.split('<')[0].trim();
  const parts = withoutGenerics.split('.');
  return (parts[parts.length - 1] ?? '').toLowerCase();
}
