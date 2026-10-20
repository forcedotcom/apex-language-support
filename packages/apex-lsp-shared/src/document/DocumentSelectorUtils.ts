/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  DocumentFilter,
  DocumentSelector,
} from 'vscode-languageserver-protocol';
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
  | 'implementation'
  | 'codeLens'
  | 'executeCommand';

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
  'implementation',
  'codeLens',
  'executeCommand',
] as const;

/**
 * Configuration for additional document schemes
 */
export interface AdditionalSchemeConfig {
  /** The scheme name to add */
  scheme: string;
  /** Optional array of capabilities to exclude this scheme from */
  excludeCapabilities?: Array<LSPCapability | 'all'>;
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
 *
 * 'memfs' is VS Code for the Web's in-memory filesystem scheme used in local dev
 * mode for Code Builder Web. 'reefs' is the Salesforce org filesystem scheme used
 * in all production Code Builder Web deployments. Without these, LSP requests are
 * not routed for workspace files in browser-based environments.
 */
export const DEFAULT_SCHEMES_FOR_MOST: readonly string[] = [
  'file',
  'apexlib',
  'vscode-test-web',
  'memfs',
  'reefs',
] as const;

/**
 * User-editable ("mutable") document schemes: the real workspace filesystems VS
 * Code opens editable Apex under (`file`, plus the web variants). Deliberately
 * EXCLUDES synthetic read-only schemes — standard library (`apexlib`) and
 * generated SObjects (`apex-sobject`) — which back non-editable virtual
 * documents. This is the source-of-truth for "can the user edit this file?"
 * decisions (e.g. rename provenance), so a synthetic scheme is never treated as
 * user-owned. Note this intentionally differs from
 * {@link getAllRequiredDefaultSchemes}, which INCLUDES `apexlib`.
 */
export const MUTABLE_DOCUMENT_SCHEMES: readonly string[] = [
  'file',
  'vscode-test-web',
  'memfs',
  'reefs',
] as const;

/**
 * Synthetic, READ-ONLY document schemes the language server itself generates for
 * non-editable virtual documents: the standard library (`apexlib`) and generated
 * SObjects (`apex-sobject`). These are a CLOSED set the server controls (a client
 * never opens editable Apex under them), so they are the source-of-truth for "is
 * this scheme NOT writable?" decisions.
 *
 * Rename provenance uses this as a BLOCKLIST rather than allow-listing the
 * editable schemes: the editable set is open-ended — `MUTABLE_DOCUMENT_SCHEMES`
 * plus any `apex.environment.additionalDocumentSchemes` a client configures
 * (which apply to all capabilities by default) — and those custom schemes are
 * not visible to the worker. Rejecting only the known synthetic read-only schemes
 * keeps configured editable schemes renamable while still refusing stdlib and
 * generated-SObject sources (W-23631087 re-review).
 */
export const READONLY_SYNTHETIC_SCHEMES: readonly string[] = [
  'apexlib',
  'apex-sobject',
] as const;

/**
 * Default schemes for CodeLens capability. Excludes `apexlib` because
 * standard-library virtual resources do not support actionable CodeLens
 * operations. This derives from the general capability set, not
 * {@link MUTABLE_DOCUMENT_SCHEMES}: CodeLens support is a capability policy,
 * not a mutability classification.
 */
export const DEFAULT_SCHEMES_FOR_CODELENS: readonly string[] =
  DEFAULT_SCHEMES_FOR_MOST.filter((scheme) => scheme !== 'apexlib');

/**
 * Virtual Org Catalog Apex sources supplied by the services extension. These
 * filters intentionally include only source artifacts: Org Catalog also owns
 * non-Apex metadata under this scheme, which must not be synchronized to LS.
 */
export const ORG_CATALOG_APEX_DOCUMENT_SELECTORS: readonly DocumentFilter[] = [
  {
    scheme: 'sf-org-metadata',
    language: 'apex',
    pattern: '**/*.cls',
  },
  {
    scheme: 'sf-org-metadata',
    language: 'apex',
    pattern: '**/*.trigger',
  },
] as const;

const ORG_CATALOG_APEX_SCHEME = 'sf-org-metadata';

/**
 * Get the built-in scheme names required by one or more default capability
 * selectors. Configuration cannot add or exclude these schemes.
 */
export function getAllRequiredDefaultSchemes(): readonly string[] {
  return [...DEFAULT_SCHEMES_FOR_MOST, ORG_CATALOG_APEX_SCHEME];
}

/** @deprecated Use {@link getAllRequiredDefaultSchemes}. */
export const getAllImmutableSchemes = getAllRequiredDefaultSchemes;

/**
 * Validate additional document schemes configuration
 * Checks for attempts to add or exclude required default schemes
 * @param additionalSchemes Array of additional scheme configurations to validate
 * @param logger Optional logger instance for warnings
 * @returns Validation result with warnings if required default schemes are detected
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
  const requiredDefaultSchemes = getAllRequiredDefaultSchemes();
  const requiredDefaultSchemesSet = new Set(requiredDefaultSchemes);
  const loggerInstance = logger ?? getLogger();

  if (!additionalSchemes || additionalSchemes.length === 0) {
    return { isValid: true, warnings: [] };
  }

  for (const config of additionalSchemes) {
    if (requiredDefaultSchemesSet.has(config.scheme)) {
      const hasExclusions =
        config.excludeCapabilities && config.excludeCapabilities.length > 0;

      if (hasExclusions && config.excludeCapabilities) {
        const warning =
          `Cannot exclude required default scheme '${config.scheme}' ` +
          `from capabilities [${config.excludeCapabilities.join(', ')}]. ` +
          `Required default schemes (${requiredDefaultSchemes.join(', ')}) ` +
          'are always included for all capabilities and cannot be excluded.';
        warnings.push(warning);
        loggerInstance.warn(() => `⚠️ ${warning}`);
      } else {
        const warning =
          `Required default scheme '${config.scheme}' cannot be added as additional scheme. ` +
          `Required default schemes (${requiredDefaultSchemes.join(', ')}) ` +
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

function getWellKnownArtifactSelectors(
  includeOrgCatalogSources: boolean,
): readonly DocumentFilter[] {
  // Org Catalog source is remote metadata. Only CodeLens consumes it directly;
  // retain it in the aggregate selector so the client synchronizes the source.
  return includeOrgCatalogSources ? ORG_CATALOG_APEX_DOCUMENT_SELECTORS : [];
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
  const requiredDefaultSchemesArray = getAllRequiredDefaultSchemes();
  const requiredDefaultSchemes = new Set(requiredDefaultSchemesArray);

  // Get default schemes for this capability
  const defaultSchemes = getDefaultSchemesForCapability(capability);

  // Start with the built-in schemes required for this capability.
  const allSchemes = new Set<string>(defaultSchemes);

  // Add additional schemes if provided and not excluded for this capability
  if (additionalSchemes) {
    for (const config of additionalSchemes) {
      // Required defaults are always included and cannot be modified.
      if (requiredDefaultSchemes.has(config.scheme)) {
        // Check if user is trying to exclude this required default scheme.
        const hasExclusions =
          config.excludeCapabilities && config.excludeCapabilities.length > 0;
        const isTryingToExclude =
          hasExclusions &&
          (config.excludeCapabilities?.includes(capability) ||
            config.excludeCapabilities?.includes('all'));

        if (isTryingToExclude) {
          logger.warn(
            () =>
              `⚠️ Cannot exclude required default scheme '${config.scheme}' from capability '${capability}'. ` +
              `Required default schemes (${requiredDefaultSchemesArray.join(', ')}) ` +
              'are always included for all capabilities and cannot be excluded. ' +
              `The excludeCapabilities setting for '${config.scheme}' is ignored.`,
          );
        } else {
          logger.warn(
            () =>
              `⚠️ Required default scheme '${config.scheme}' cannot be added as additional scheme. ` +
              `Required default schemes (${requiredDefaultSchemesArray.join(', ')}) ` +
              'are always included for all capabilities and cannot be modified.',
          );
        }
        // Skip - required default schemes are already included in selectors.
        continue;
      }

      // Check if this scheme is excluded for this capability
      const isExcluded = config.excludeCapabilities?.includes(capability);

      if (!isExcluded) {
        allSchemes.add(config.scheme);
      }
    }
  }

  return [
    ...buildDocumentSelectors(Array.from(allSchemes), DEFAULT_LANGUAGES),
    ...getWellKnownArtifactSelectors(capability === 'codeLens'),
  ];
}

/**
 * Gets the document selectors used to synchronize workspace and Org Catalog
 * source documents to the language server. This is transport scope, not a
 * language-feature capability.
 */
export function getDocumentSynchronizationSelectors(
  additionalSchemes?: AdditionalSchemeConfig[],
): DocumentSelector {
  const schemes = new Set([
    ...DEFAULT_SCHEMES_FOR_MOST,
    ...MUTABLE_DOCUMENT_SCHEMES,
  ]);
  for (const config of additionalSchemes ?? []) {
    if (!getAllRequiredDefaultSchemes().includes(config.scheme)) {
      schemes.add(config.scheme);
    }
  }
  return [
    ...buildDocumentSelectors(Array.from(schemes), DEFAULT_LANGUAGES),
    ...getWellKnownArtifactSelectors(true),
  ];
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

  // Convert settings format to utility format.
  // Settings use string[] for excludeCapabilities, but we validate against LSPCapability
  const additionalSchemes: AdditionalSchemeConfig[] | undefined =
    additionalSchemesConfig?.map((config) => ({
      scheme: config.scheme,
      excludeCapabilities: config.excludeCapabilities?.filter((cap) =>
        VALID_LSP_CAPABILITIES.includes(cap),
      ) as Array<LSPCapability | 'all'> | undefined,
    }));

  return getDocumentSelectorsForCapability(capability, additionalSchemes);
}

/** Gets synchronization selectors with configured additional schemes. */
export function getDocumentSynchronizationSelectorsFromSettings(
  settings?: ApexLanguageServerSettings,
): DocumentSelector {
  const additionalSchemes =
    settings?.apex?.environment?.additionalDocumentSchemes?.map((config) => ({
      scheme: config.scheme,
    }));
  return getDocumentSynchronizationSelectors(additionalSchemes);
}

/**
 * Get default document selectors for a capability (without additional schemes).
 * @returns Array of default document selectors
 */
export function getDefaultDocumentSelectors(
  capability: LSPCapability,
): DocumentSelector {
  return getDocumentSelectorsForCapability(capability);
}
