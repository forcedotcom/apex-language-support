/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { DocumentSelector } from 'vscode-languageserver-protocol';
import type { ApexLanguageServerSettings } from '../server/ApexLanguageServerSettings';
import { getLogger } from '../logger';

/**
 * LSP capability types that support document selectors
 */
export type LSPCapability =
  | 'documentSymbol'
  | 'hover'
  | 'foldingRange'
  | 'diagnostic'
  | 'completion'
  | 'definition'
  | 'codeLens'
  | 'executeCommand'
  | 'all';

/**
 * Valid LSP capability names for validation
 */
const VALID_LSP_CAPABILITIES: readonly string[] = [
  'documentSymbol',
  'hover',
  'foldingRange',
  'diagnostic',
  'completion',
  'definition',
  'codeLens',
  'executeCommand',
  'all',
] as const;

/**
 * Configuration for additional document schemes
 */
export interface AdditionalSchemeConfig {
  /** The scheme name to add */
  scheme: string;
  /** Optional array of capabilities to exclude this scheme from */
  excludeCapabilities?: LSPCapability[];
}

/**
 * Immutable default languages for Apex document selectors
 */
export const DEFAULT_LANGUAGES: readonly string[] = [
  'apex',
  'apex-anon',
] as const;

/**
 * Immutable default schemes for most LSP capabilities
 * Includes: documentSymbol, hover, foldingRange, diagnostic, completion, definition
 */
export const DEFAULT_SCHEMES_FOR_MOST: readonly string[] = [
  'file',
  'apexlib',
  'vscode-test-web',
] as const;

/**
 * Immutable default schemes for CodeLens capability
 * Excludes 'apexlib' as CodeLens should not operate on standard library files
 */
export const DEFAULT_SCHEMES_FOR_CODELENS: readonly string[] = [
  'file',
  'vscode-test-web',
] as const;

/**
 * Get all immutable scheme names (union of all default schemes)
 * These schemes cannot be excluded or removed
 */
export function getAllImmutableSchemes(): readonly string[] {
  return [
    ...new Set([...DEFAULT_SCHEMES_FOR_MOST, ...DEFAULT_SCHEMES_FOR_CODELENS]),
  ];
}

/**
 * Validate additional document schemes configuration
 * Checks for attempts to add or exclude immutable schemes
 * @param additionalSchemes Array of additional scheme configurations to validate
 * @param logger Optional logger instance for warnings
 * @returns Validation result with warnings if immutable schemes are detected
 */
export function validateAdditionalDocumentSchemes(
  additionalSchemes?: Array<{
    scheme: string;
    excludeCapabilities?: string[];
  }>,
  logger?: ReturnType<typeof getLogger>,
): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const immutableSchemesSet = new Set(getAllImmutableSchemes());
  const loggerInstance = logger ?? getLogger();

  if (!additionalSchemes || additionalSchemes.length === 0) {
    return { isValid: true, warnings: [] };
  }

  for (const config of additionalSchemes) {
    if (immutableSchemesSet.has(config.scheme)) {
      const hasExclusions =
        config.excludeCapabilities && config.excludeCapabilities.length > 0;

      if (hasExclusions && config.excludeCapabilities) {
        const warning =
          `Cannot exclude immutable scheme '${config.scheme}' ` +
          `from capabilities [${config.excludeCapabilities.join(', ')}]. ` +
          `Immutable schemes (${getAllImmutableSchemes().join(', ')}) ` +
          'are always included for all capabilities and cannot be excluded.';
        warnings.push(warning);
        loggerInstance.warn(() => `⚠️ ${warning}`);
      } else {
        const warning =
          `Immutable scheme '${config.scheme}' cannot be added as additional scheme. ` +
          `Immutable schemes (${getAllImmutableSchemes().join(', ')}) ` +
          'are always included and cannot be modified.';
        warnings.push(warning);
        loggerInstance.warn(() => `⚠️ ${warning}`);
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Get default schemes for a specific LSP capability
 * @param capability The LSP capability name
 * @returns Array of default scheme names for the capability
 */
export function getDefaultSchemesForCapability(
  capability: LSPCapability,
): readonly string[] {
  if (capability === 'codeLens') {
    return DEFAULT_SCHEMES_FOR_CODELENS;
  }
  if (capability === 'all') {
    // For 'all', return the union of all schemes
    return [
      ...new Set([
        ...DEFAULT_SCHEMES_FOR_MOST,
        ...DEFAULT_SCHEMES_FOR_CODELENS,
      ]),
    ];
  }
  // For all other capabilities, use the default schemes
  return DEFAULT_SCHEMES_FOR_MOST;
}

/**
 * Build document selectors from schemes and languages
 * @param schemes Array of scheme names
 * @param languages Array of language IDs
 * @returns Array of document selectors
 */
function buildDocumentSelectors(
  schemes: readonly string[],
  languages: readonly string[],
): DocumentSelector {
  const selectors: DocumentSelector = [];
  for (const scheme of schemes) {
    for (const language of languages) {
      selectors.push({ scheme, language });
    }
  }
  return selectors;
}

/**
 * Get document selectors for a specific capability with optional additional schemes
 * @param capability The LSP capability name
 * @param additionalSchemes Optional array of additional scheme configurations
 * @returns Array of document selectors for the capability
 */
export function getDocumentSelectorsForCapability(
  capability: LSPCapability,
  additionalSchemes?: AdditionalSchemeConfig[],
): DocumentSelector {
  const logger = getLogger();
  const immutableSchemesArray = getAllImmutableSchemes();
  const immutableSchemes = new Set(immutableSchemesArray);

  // Get default schemes for this capability
  const defaultSchemes = getDefaultSchemesForCapability(capability);

  // Start with default schemes (immutable - always included)
  const allSchemes = new Set<string>(defaultSchemes);

  // Add additional schemes if provided and not excluded for this capability
  if (additionalSchemes) {
    for (const config of additionalSchemes) {
      // Runtime validation: Prevent adding or excluding immutable schemes
      // Immutable schemes are always included in defaults and cannot be modified
      if (immutableSchemes.has(config.scheme)) {
        // Check if user is trying to exclude this immutable scheme
        const hasExclusions =
          config.excludeCapabilities && config.excludeCapabilities.length > 0;
        const isTryingToExclude =
          hasExclusions &&
          (capability === 'all' ||
            config.excludeCapabilities?.includes(capability) ||
            config.excludeCapabilities?.includes('all'));

        if (isTryingToExclude) {
          logger.warn(
            () =>
              `⚠️ Cannot exclude immutable scheme '${config.scheme}' from capability '${capability}'. ` +
              `Immutable schemes (${immutableSchemesArray.join(', ')}) ` +
              'are always included for all capabilities and cannot be excluded. ' +
              `The excludeCapabilities setting for '${config.scheme}' is ignored.`,
          );
        } else {
          logger.warn(
            () =>
              `⚠️ Immutable scheme '${config.scheme}' cannot be added as additional scheme. ` +
              `Immutable schemes (${immutableSchemesArray.join(', ')}) ` +
              'are always included for all capabilities and cannot be modified.',
          );
        }
        // Skip - immutable schemes are already included in defaults
        continue;
      }

      // Check if this scheme is excluded for this capability
      const isExcluded =
        capability !== 'all' &&
        config.excludeCapabilities?.includes(capability);

      if (!isExcluded) {
        allSchemes.add(config.scheme);
      }
    }
  }

  // Build and return document selectors
  return buildDocumentSelectors(Array.from(allSchemes), DEFAULT_LANGUAGES);
}

/**
 * Get document selectors from settings for a specific capability
 * @param capability The LSP capability name
 * @param settings Optional Apex language server settings
 * @returns Array of document selectors for the capability
 */
export function getDocumentSelectorsFromSettings(
  capability: LSPCapability,
  settings?: ApexLanguageServerSettings,
): DocumentSelector {
  const additionalSchemesConfig =
    settings?.apex?.environment?.additionalDocumentSchemes;

  // Convert settings format to utility format (string[] to LSPCapability[])
  // Settings use string[] for excludeCapabilities, but we validate against LSPCapability
  const additionalSchemes: AdditionalSchemeConfig[] | undefined =
    additionalSchemesConfig?.map((config) => ({
      scheme: config.scheme,
      excludeCapabilities: config.excludeCapabilities?.filter((cap) =>
        VALID_LSP_CAPABILITIES.includes(cap),
      ) as LSPCapability[] | undefined,
    }));

  return getDocumentSelectorsForCapability(capability, additionalSchemes);
}

/**
 * Get default document selectors for a capability (without additional schemes)
 * @param capability Optional capability name (defaults to 'all')
 * @returns Array of default document selectors
 */
export function getDefaultDocumentSelectors(
  capability: LSPCapability = 'all',
): DocumentSelector {
  return getDocumentSelectorsForCapability(capability);
}
