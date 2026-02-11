/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Layer } from 'effect';
import type {
  SymbolTable,
  MethodSymbol,
  TypeSymbol,
  Annotation,
} from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import { SymbolKind } from '../../../types/symbol';
import {
  ArtifactLoadingHelper,
  ArtifactLoadingHelperLive,
  ISymbolManager,
} from '../ArtifactLoadingHelper';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';
import { CaseInsensitiveHashMap } from '../../../utils/CaseInsensitiveMap';

/**
 * Helper to get annotation parameter value by name
 * Strips surrounding quotes if present
 */
function getAnnotationParameter(
  annotation: Annotation,
  paramName: string,
): string | undefined {
  if (!annotation.parameters) {
    return undefined;
  }
  const param = annotation.parameters.find(
    (p) => p.name?.toLowerCase() === paramName.toLowerCase(),
  );
  if (!param?.value) {
    return undefined;
  }
  // Strip surrounding quotes if present (single or double)
  let value = param.value.trim();
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

/**
 * Helper to get a specific annotation from a method
 */
function getAnnotation(
  method: MethodSymbol,
  annotationName: string,
): Annotation | undefined {
  const annotationNameLower = annotationName.toLowerCase();
  return method.annotations?.find((ann) => {
    const baseName = getBaseAnnotationName(ann.name);
    return baseName.toLowerCase() === annotationNameLower;
  });
}

/**
 * Format validation function type
 * Returns error code if format is invalid, undefined if valid
 */
type FormatValidator = (
  value: string,
  propertyName: string,
) => string | undefined;

/**
 * Registry of common annotations and their property requirements
 */
/**
 * Numeric comparison constraint
 */
interface NumericComparison {
  operator: '>=' | '<=';
  value: number;
}

interface AnnotationPropertyInfo {
  requiredProperties?: string[];
  optionalProperties?: string[];
  propertyValueTypes?: CaseInsensitiveHashMap<'string' | 'boolean' | 'number'>;
  propertyEnumValues?: CaseInsensitiveHashMap<string[]>; // Enum string values for specific properties
  /**
   * Invalid string values that should be rejected
   * Uses canonical camelCase property names (e.g., 'category', 'label')
   */
  propertyInvalidStringValues?: CaseInsensitiveHashMap<string[]>; // Blacklist of invalid string values
  propertyIntegerRanges?: CaseInsensitiveHashMap<{ min: number; max: number }>; // Integer range constraints
  /**
   * Numeric comparison constraints (>= or <=) for properties
   * Uses canonical camelCase property names (e.g., 'delay', 'timeout')
   */
  propertyNumericComparisons?: CaseInsensitiveHashMap<NumericComparison>;
  /**
   * Minimum API version required for specific properties (major version only)
   * Uses canonical camelCase property names (e.g., 'seeAllData', 'isParallel')
   */
  propertyMinVersions?: CaseInsensitiveHashMap<number>;
  /**
   * Maximum API version for deprecated properties (major version only)
   * Uses canonical camelCase property names (e.g., 'seeAllData', 'isParallel')
   */
  propertyMaxVersions?: CaseInsensitiveHashMap<number>;
  /**
   * Format validators for specific properties
   * Map: propertyName (canonical camelCase) -> FormatValidator function
   */
  propertyFormatValidators?: CaseInsensitiveHashMap<FormatValidator>;
  /**
   * Sibling property restrictions - invalid combinations of properties
   * Array of [property1, property2] pairs that cannot be used together
   */
  propertySiblingRestrictions?: Array<[string, string]>;
  /**
   * Allowed targets for specific properties
   * Map: propertyName -> Array of allowed SymbolKind values
   * If not specified, property is allowed on all targets
   */
  propertyAllowedTargets?: CaseInsensitiveHashMap<SymbolKind[]>;
}

const ANNOTATION_PROPERTY_REGISTRY: Map<string, AnnotationPropertyInfo> =
  new Map([
    [
      'restresource',
      {
        requiredProperties: ['urlMapping'],
        optionalProperties: [],
      },
    ],
    [
      'deprecated',
      {
        optionalProperties: ['message', 'apiVersion', 'added', 'removed'],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([
          ['message', 'string'],
          ['apiVersion', 'string'],
          ['added', 'string'],
          ['removed', 'string'],
        ]),
      },
    ],
    [
      'istest',
      {
        optionalProperties: [
          'seeAllData',
          'isParallel',
          'critical',
          'testFor',
          'onInstall',
        ],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([
          ['seeAllData', 'boolean'],
          ['isParallel', 'boolean'],
          ['critical', 'boolean'],
          ['testFor', 'string'],
          ['onInstall', 'boolean'],
        ]),
        propertyMinVersions: new CaseInsensitiveHashMap<number>([
          ['seeAllData', 17], // V17.4 -> 17
          ['isParallel', 20], // V20.8 -> 20
          ['critical', 26], // V26.0 -> 26
          ['testFor', 17], // V17.4 -> 17
          ['onInstall', 26], // V26.0 -> 26
        ]),
        propertySiblingRestrictions: [['isParallel', 'seeAllData']],
      },
    ],
    [
      'auraenabled',
      {
        optionalProperties: [
          'cacheable',
          'continuation',
          'scope',
          'translatable',
        ],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([
          ['cacheable', 'boolean'],
          ['continuation', 'boolean'],
          ['scope', 'string'],
          ['translatable', 'boolean'],
        ]),
        propertyEnumValues: new CaseInsensitiveHashMap<string[]>([
          ['scope', ['global']],
        ]),
        propertyMinVersions: new CaseInsensitiveHashMap<number>([
          ['scope', 22], // V22.6 -> 22
        ]),
      },
    ],
    [
      'invocablemethod',
      {
        optionalProperties: [
          'label',
          'description',
          'category',
          'configuration',
          'callout',
          'configurationEditor',
          'iconName',
          'capabilityType',
          'apiVersion',
          'minVersion',
          'maxVersion',
        ],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([
          ['label', 'string'],
          ['description', 'string'],
          ['category', 'string'],
          ['configuration', 'string'],
          ['callout', 'boolean'],
          ['configurationEditor', 'string'],
          ['iconName', 'string'],
          ['capabilityType', 'string'],
          ['apiVersion', 'string'],
          ['minVersion', 'string'],
          ['maxVersion', 'string'],
        ]),
        propertyMinVersions: new CaseInsensitiveHashMap<number>([
          ['callout', 23], // V23.8 -> 23
          ['configurationEditor', 24], // V24.8 -> 24
          ['iconName', 25], // V25.0 -> 25
        ]),
        propertyFormatValidators: new CaseInsensitiveHashMap<FormatValidator>([
          ['configurationEditor', validateLWCName],
          ['iconName', validateStaticResourceName],
        ]),
      },
    ],
    [
      'invocablevariable',
      {
        optionalProperties: [
          'description',
          'label',
          'required',
          'defaultValue',
          'placeholderText',
        ],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([
          ['description', 'string'],
          ['label', 'string'],
          ['required', 'boolean'],
          ['defaultValue', 'string'],
          ['placeholderText', 'string'],
        ]),
      },
    ],
    [
      'future',
      {
        optionalProperties: ['callout', 'delay', 'limits'],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([
          ['callout', 'boolean'],
          ['delay', 'number'],
          ['limits', 'string'],
        ]),
        propertyIntegerRanges: new CaseInsensitiveHashMap<{
          min: number;
          max: number;
        }>([['delay', { min: 0, max: 900 }]]),
        // Note: propertyNumericComparisons can be used for standalone >= or <= checks
        // when you don't need both bounds. For delay, we use propertyIntegerRanges instead.
        propertyEnumValues: new CaseInsensitiveHashMap<string[]>([
          [
            'limits',
            [
              'HEAP501MB',
              'STATEMENTS2M',
              '2xHeap',
              '3xHeap',
              '2xCpu',
              '3xCpu',
              '2xSoql',
              '3xSoql',
              '2xDml',
              '3xDml',
              '2xDmlRows',
              '3xDmlRows',
            ],
          ],
        ]),
        propertyMinVersions: new CaseInsensitiveHashMap<number>([
          ['delay', 17], // V17.6 -> 17
        ]),
      },
    ],
    [
      'readonly',
      {
        optionalProperties: ['useReplica'],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([['useReplica', 'string']]),
        propertyEnumValues: new CaseInsensitiveHashMap<string[]>([
          ['useReplica', ['never', 'preferred']],
        ]),
        propertyMinVersions: new CaseInsensitiveHashMap<number>([
          ['useReplica', 23], // V23.8 -> 23
        ]),
        propertyMaxVersions: new CaseInsensitiveHashMap<number>([
          ['useReplica', 22], // Max V22.2 -> 22 (deprecated)
        ]),
      },
    ],
    [
      'remoteaction',
      {
        optionalProperties: ['callout'],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([['callout', 'boolean']]),
        propertyMinVersions: new CaseInsensitiveHashMap<number>([
          ['callout', 22], // V22.4 -> 22
        ]),
      },
    ],
    [
      'suppresswarnings',
      {
        requiredProperties: ['value'],
        optionalProperties: [],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([['value', 'string']]),
      },
    ],
    [
      'testsetup',
      {
        optionalProperties: ['onInstall'],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([['onInstall', 'boolean']]),
      },
    ],
    [
      'jsonaccess',
      {
        optionalProperties: ['serializable', 'deserializable'],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([
          ['serializable', 'string'],
          ['deserializable', 'string'],
        ]),
        propertyEnumValues: new CaseInsensitiveHashMap<string[]>([
          ['serializable', ['never', 'samePackage', 'sameNamespace', 'always']],
          [
            'deserializable',
            ['never', 'samePackage', 'sameNamespace', 'always'],
          ],
        ]),
      },
    ],
    [
      'httpget',
      {
        optionalProperties: ['urlMapping'],
        propertyValueTypes: new CaseInsensitiveHashMap<
          'string' | 'boolean' | 'number'
        >([['urlMapping', 'string']]),
      },
    ],
    // HTTP annotations with no parameters (for completeness - to catch unsupported properties)
    ['httppost', { optionalProperties: [] }],
    ['httpput', { optionalProperties: [] }],
    ['httpdelete', { optionalProperties: [] }],
    ['httppatch', { optionalProperties: [] }],
  ]);

/**
 * Check if a property value matches the expected type
 */
function isValidPropertyValue(
  value: string,
  expectedType: 'string' | 'boolean' | 'number',
  enumValues?: string[],
  integerRange?: { min: number; max: number },
): boolean {
  const trimmed = value.trim();
  // Strip surrounding quotes for comparison
  let unquoted = trimmed;
  const isQuoted =
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'));
  if (isQuoted) {
    unquoted = trimmed.slice(1, -1);
  }

  if (expectedType === 'boolean') {
    // Boolean values must be unquoted: true or false (not 'true' or "false")
    return trimmed === 'true' || trimmed === 'false';
  }
  if (expectedType === 'number') {
    const numValue = Number(unquoted);
    if (isNaN(numValue)) {
      return false;
    }
    // Check integer range if specified
    if (integerRange) {
      return (
        Number.isInteger(numValue) &&
        numValue >= integerRange.min &&
        numValue <= integerRange.max
      );
    }
    return true;
  }
  // String type
  if (enumValues && enumValues.length > 0) {
    // Check if value matches one of the enum values (case-insensitive)
    return enumValues.some(
      (enumVal) => enumVal.toLowerCase() === unquoted.toLowerCase(),
    );
  }
  // Any non-empty string value is valid
  return trimmed.length > 0;
}

/**
 * Extract the base annotation name (without parameters)
 * Annotation names can be stored as "ReadOnly(useReplica='invalid')" or just "ReadOnly"
 */
function getBaseAnnotationName(annotationName: string): string {
  // Remove parameters if present: "ReadOnly(useReplica='invalid')" -> "ReadOnly"
  const parenIndex = annotationName.indexOf('(');
  if (parenIndex >= 0) {
    return annotationName.substring(0, parenIndex).trim();
  }
  return annotationName.trim();
}

/**
 * Get all parameter names from an annotation
 * For positional parameters (like @SuppressWarnings('PMD')), maps to 'value' if it's the first parameter
 */
function getAnnotationParameterNames(annotation: Annotation): string[] {
  if (!annotation.parameters) {
    return [];
  }
  const names: string[] = [];
  for (let i = 0; i < annotation.parameters.length; i++) {
    const param = annotation.parameters[i];
    if (param.name) {
      names.push(param.name);
    } else if (i === 0) {
      // First positional parameter maps to 'value' for annotations like @SuppressWarnings
      names.push('value');
    }
  }
  return names;
}

/**
 * Parse testFor property value into type references
 * Format: "ApexClass:ClassName" or "ApexTrigger:TriggerName"
 * Supports comma-separated: "ApexClass:Class1, ApexTrigger:Trigger1"
 */
interface TestForReference {
  prefix: 'ApexClass' | 'ApexTrigger';
  typeName: string;
}

/**
 * Parse testFor value and validate format
 * Returns parsed references and validation errors
 */
interface TestForParseResult {
  references: TestForReference[];
  errors: Array<{
    code: string;
    message: string;
    part: string;
  }>;
}

function parseTestForValue(value: string): TestForParseResult {
  const references: TestForReference[] = [];
  const errors: Array<{ code: string; message: string; part: string }> = [];

  // Split by comma and parse each reference
  const parts = value.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part.length === 0) continue; // Skip empty parts

    const colonIndex = part.indexOf(':');

    // Check if colon exists
    if (colonIndex < 0) {
      // No colon - invalid format, but try to provide helpful error
      // Check if it looks like it might be missing a prefix
      if (part.length > 0 && !part.includes(':')) {
        errors.push({
          code: ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX,
          message: localizeTyped(
            ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX,
            'testFor',
            part,
            'ApexClass or ApexTrigger',
          ),
          part,
        });
      }
      continue;
    }

    const prefix = part.substring(0, colonIndex).trim();
    const typeName = part.substring(colonIndex + 1).trim();

    // Validate prefix
    if (prefix !== 'ApexClass' && prefix !== 'ApexTrigger') {
      errors.push({
        code: ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX,
        message: localizeTyped(
          ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX,
          'testFor',
          part,
          'ApexClass or ApexTrigger',
        ),
        part,
      });
      continue;
    }

    // Validate type name is not empty
    if (typeName.length === 0) {
      const typeKind = prefix === 'ApexClass' ? 'Class' : 'Trigger';
      errors.push({
        code: ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX,
        message: localizeTyped(
          ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX,
          'testFor',
          typeKind,
        ),
        part,
      });
      continue;
    }

    // Valid reference
    references.push({
      prefix: prefix as 'ApexClass' | 'ApexTrigger',
      typeName,
    });
  }

  return { references, errors };
}

/**
 * Compare API versions for annotation property validation (major version only)
 * Returns true if current version >= required version
 */
function isVersionAtLeast(
  currentMajor: number | undefined,
  requiredMajor: number,
): boolean {
  if (currentMajor === undefined) {
    // If no version specified, assume latest (allow all)
    return true;
  }
  return currentMajor >= requiredMajor;
}

/**
 * Compare API versions for deprecated properties (major version only)
 * Returns true if current version <= max version
 */
function isVersionAtMost(
  currentMajor: number | undefined,
  maxMajor: number,
): boolean {
  if (currentMajor === undefined) {
    // If no version specified, assume latest (deprecated properties not allowed)
    return false;
  }
  return currentMajor <= maxMajor;
}

/**
 * Validate Lightning Web Component name format
 * Rules: camelCase, starts with lowercase letter, alphanumeric, no spaces
 * Examples: "myComponent", "myLWCComponent", "component123"
 * Invalid: "MyComponent", "my-component", "my component", "123component"
 */
function validateLWCName(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME;
  }

  const trimmed = value.trim();

  // Must start with lowercase letter
  if (!/^[a-z]/.test(trimmed)) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME;
  }

  // Must only contain alphanumeric characters (camelCase allowed)
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME;
  }

  return undefined; // Valid format
}

/**
 * Validate API version format
 * Rules: "major.minor" format (e.g., "65.0", "20.8")
 * Both major and minor must be numeric, separated by a dot
 * Examples: "65.0", "20.8", "1.0"
 * Invalid: "65", "20.8.1", "abc.0", "65.", ".0"
 */
function validateAPIVersionFormat(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION;
  }

  const trimmed = value.trim();

  // Must match pattern: one or more digits, dot, one or more digits
  const apiVersionPattern = /^\d+\.\d+$/;
  if (!apiVersionPattern.test(trimmed)) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION;
  }

  // Split and validate parts are numeric (pattern already ensures this, but double-check)
  const parts = trimmed.split('.');
  if (parts.length !== 2) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION;
  }

  const major = Number.parseInt(parts[0], 10);
  const minor = Number.parseInt(parts[1], 10);

  if (isNaN(major) || isNaN(minor)) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION;
  }

  return undefined; // Valid format
}

/** Property names that require API version format (major.minor) validation */
const API_VERSION_FORMAT_PROPERTIES = new Set([
  'apiversion',
  'minversion',
  'maxversion',
  'added',
  'removed',
]);

/**
 * Validate static resource name format
 * Rules: alphanumeric, underscores, starts with letter or underscore, no spaces
 * Examples: "MyResource", "my_resource", "_MyResource", "Resource123"
 * Invalid: "my-resource", "my resource", "123Resource"
 */
function validateStaticResourceName(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME;
  }

  const trimmed = value.trim();

  // Must start with letter or underscore
  if (!/^[A-Za-z_]/.test(trimmed)) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME;
  }

  // Must only contain alphanumeric characters and underscores
  if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
    return ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME;
  }

  return undefined; // Valid format (existence check would be TIER 2)
}

/**
 * Resolve testFor type references using symbol manager
 * Returns map of typeName -> { found: boolean, kind: SymbolKind | null }
 * This function requires ArtifactLoadingHelper to be provided via Effect.provide
 */
function resolveTestForTypes(
  references: TestForReference[],
  symbolManager: ISymbolManagerInterface,
  options: ValidationOptions,
): Effect.Effect<
  Map<string, { found: boolean; kind: SymbolKind | null }>,
  never,
  typeof ArtifactLoadingHelper
> {
  const innerEffect = Effect.gen(function* () {
    const results = new Map<
      string,
      { found: boolean; kind: SymbolKind | null }
    >();

    // Try to find types in symbol manager
    for (const ref of references) {
      const symbols = symbolManager.findSymbolByName(ref.typeName);
      const expectedKind =
        ref.prefix === 'ApexClass' ? SymbolKind.Class : SymbolKind.Trigger;

      const found = symbols.find((s: any) => s.kind === expectedKind) as any;

      if (found) {
        results.set(ref.typeName, { found: true, kind: found.kind });
      } else {
        results.set(ref.typeName, { found: false, kind: null });
      }
    }

    // Load missing artifacts if allowed
    const missingTypes = Array.from(results.entries())
      .filter(([_, result]) => !result.found)
      .map(([typeName, _]) => typeName);

    if (
      missingTypes.length > 0 &&
      options.allowArtifactLoading &&
      options.loadArtifactCallback
    ) {
      // Use ArtifactLoadingHelper to load missing types
      const helper = yield* ArtifactLoadingHelper;
      const loadResult = yield* helper.loadMissingArtifacts(
        missingTypes,
        options,
      );

      // Re-check loaded types
      for (const typeName of loadResult.loaded) {
        const ref = references.find((r) => r.typeName === typeName);
        if (ref) {
          const symbols = symbolManager.findSymbolByName(typeName);
          const expectedKind =
            ref.prefix === 'ApexClass' ? SymbolKind.Class : SymbolKind.Trigger;
          const found = symbols.find(
            (s: any) => s.kind === expectedKind,
          ) as any;
          if (found) {
            results.set(typeName, { found: true, kind: found.kind });
          }
        }
      }
    }

    return results;
  });

  // Provide the layer here to eliminate the requirement from the return type
  // The caller must provide ISymbolManager layer first
  const symbolManagerLayer = Layer.succeed(ISymbolManager, symbolManager);
  const artifactLayer = Layer.provide(
    ArtifactLoadingHelperLive,
    symbolManagerLayer,
  );
  const fullLayer = Layer.mergeAll(symbolManagerLayer, artifactLayer);
  return innerEffect.pipe(Effect.provide(fullLayer)) as Effect.Effect<
    Map<string, { found: boolean; kind: SymbolKind | null }>,
    never,
    never
  >;
}

/**
 * Validates annotation properties for @RestResource and @InvocableMethod.
 *
 * For @RestResource:
 * - URL must not be empty
 * - URL must not exceed 255 characters
 * - URL must begin with a forward slash '/'
 * - URL must be valid (no illegal wildcard usage)
 *
 * For @InvocableMethod:
 * - Method must have exactly one parameter
 * - Parameter must be a List type (List<T>)
 * - Method can only have @Deprecated annotation in addition to @InvocableMethod
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 1.3
 */
export const AnnotationPropertyValidator: Validator = {
  id: 'annotation-property',
  name: 'Annotation Property Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 5, // Run after DuplicateAnnotationMethodValidator
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Validate @RestResource classes
      const classes = allSymbols.filter(
        (symbol): symbol is TypeSymbol =>
          (symbol.kind === SymbolKind.Class ||
            symbol.kind === SymbolKind.Interface) &&
          'annotations' in symbol,
      );

      for (const classSymbol of classes) {
        if (!classSymbol.annotations) {
          continue;
        }

        const restResourceAnnotation = classSymbol.annotations.find((ann) => {
          const baseName = getBaseAnnotationName(ann.name);
          const baseNameLower = baseName.toLowerCase();
          return (
            baseNameLower.startsWith('restresource') ||
            baseNameLower === 'restresource'
          );
        });

        if (restResourceAnnotation) {
          // Validate urlMapping parameter
          const urlMapping = getAnnotationParameter(
            restResourceAnnotation,
            'urlMapping',
          );

          // Check if parameter is missing
          if (urlMapping === undefined) {
            // Missing required parameter - this should be caught by AnnotationValidator
            // but we'll skip further validation here
            continue;
          }

          // Check if URL is empty (after stripping quotes)
          if (urlMapping.trim().length === 0) {
            const code = ErrorCodes.REST_RESOURCE_URL_EMPTY;
            errors.push({
              message: localizeTyped(code),
              location: restResourceAnnotation.location,
              code,
            });
            continue; // Skip further URL validation if empty
          }

          // Check if URL is too long
          if (urlMapping.length > 255) {
            const code = ErrorCodes.REST_RESOURCE_URL_TOO_LONG;
            errors.push({
              message: localizeTyped(code),
              location: restResourceAnnotation.location,
              code,
            });
          }

          // Check if URL starts with '/'
          if (!urlMapping.startsWith('/')) {
            const code = ErrorCodes.REST_RESOURCE_URL_NO_SLASH;
            errors.push({
              message: localizeTyped(code),
              location: restResourceAnnotation.location,
              code,
            });
          } else {
            // Check for invalid URL format (valid path chars: /, letters, digits, hyphens, underscores, *)
            const validUrlPathRegex = /^\/[a-zA-Z0-9_\-*/]+$/;
            if (!validUrlPathRegex.test(urlMapping)) {
              const code = ErrorCodes.REST_RESOURCE_URL_INVALID_URL;
              errors.push({
                message: localizeTyped(code),
                location: restResourceAnnotation.location,
                code,
              });
            }
          }

          // Check for illegal wildcard usage
          const wildcardIndex = urlMapping.indexOf('*');
          if (wildcardIndex >= 0) {
            // Check if wildcard is preceded by '/'
            if (wildcardIndex > 0 && urlMapping[wildcardIndex - 1] !== '/') {
              const code =
                ErrorCodes.REST_RESOURCE_URL_ILLEGAL_WILDCARD_PREDECESSOR;
              errors.push({
                message: localizeTyped(code),
                location: restResourceAnnotation.location,
                code,
              });
            }

            // Check if wildcard is followed by '/' or is last character
            if (
              wildcardIndex < urlMapping.length - 1 &&
              urlMapping[wildcardIndex + 1] !== '/'
            ) {
              const code =
                ErrorCodes.REST_RESOURCE_URL_ILLEGAL_WILDCARD_SUCCESSOR;
              errors.push({
                message: localizeTyped(code),
                location: restResourceAnnotation.location,
                code,
              });
            }
          }
        }
      }

      // General annotation property validation for all annotations
      // Check for missing required properties, invalid values, and unsupported properties
      for (const classSymbol of classes) {
        if (!classSymbol.annotations) {
          continue;
        }

        for (const annotation of classSymbol.annotations) {
          const baseName = getBaseAnnotationName(annotation.name);
          const annotationNameLower = baseName.toLowerCase();
          const propertyInfo =
            ANNOTATION_PROPERTY_REGISTRY.get(annotationNameLower);

          if (propertyInfo) {
            const paramNames = getAnnotationParameterNames(annotation);

            // Check for duplicate parameters
            const seenNames = new Set<string>();
            for (const paramName of paramNames) {
              const paramNameLower = paramName.toLowerCase();
              if (seenNames.has(paramNameLower)) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER,
                    paramName,
                  ),
                  location: annotation.location,
                  code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER,
                });
              } else {
                seenNames.add(paramNameLower);
              }
            }

            // Check for missing required properties
            if (propertyInfo.requiredProperties) {
              for (const requiredProp of propertyInfo.requiredProperties) {
                if (
                  !paramNames.some(
                    (name) => name.toLowerCase() === requiredProp.toLowerCase(),
                  )
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.ANNOTATION_PROPERTY_MISSING,
                      requiredProp,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.ANNOTATION_PROPERTY_MISSING,
                  });
                }
              }
            }

            // Check for unsupported properties
            const allSupportedProperties = [
              ...(propertyInfo.requiredProperties || []),
              ...(propertyInfo.optionalProperties || []),
            ];
            for (const paramName of paramNames) {
              if (
                !allSupportedProperties.some(
                  (supported) =>
                    supported.toLowerCase() === paramName.toLowerCase(),
                )
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED,
                    paramName,
                    annotation.name,
                  ),
                  location: annotation.location,
                  code: ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED,
                });
              }
            }

            // Check for invalid property values
            if (propertyInfo.propertyValueTypes && annotation.parameters) {
              for (const param of annotation.parameters) {
                if (
                  !param.name ||
                  param.value === undefined ||
                  param.value === null
                ) {
                  continue;
                }

                // Check for empty property values
                let trimmedValue = param.value.trim();
                // Strip surrounding quotes
                if (
                  (trimmedValue.startsWith("'") &&
                    trimmedValue.endsWith("'")) ||
                  (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
                ) {
                  trimmedValue = trimmedValue.slice(1, -1);
                }

                if (trimmedValue.length === 0) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.ANNOTATION_PROPERTY_CANNOT_BE_EMPTY,
                      param.name,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.ANNOTATION_PROPERTY_CANNOT_BE_EMPTY,
                  });
                  continue; // Skip further validation for empty values
                }

                // API version format validation for apiVersion, minVersion, maxVersion, added, removed
                if (
                  API_VERSION_FORMAT_PROPERTIES.has(param.name.toLowerCase())
                ) {
                  const apiVersionError =
                    validateAPIVersionFormat(trimmedValue);
                  if (apiVersionError) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION,
                        param.name,
                        annotation.name,
                        trimmedValue,
                      ),
                      location: annotation.location,
                      code: apiVersionError,
                    });
                    continue;
                  }
                }

                const expectedType = propertyInfo.propertyValueTypes.get(
                  param.name,
                );
                if (expectedType) {
                  const enumValues = propertyInfo.propertyEnumValues?.get(
                    param.name,
                  );
                  const integerRange = propertyInfo.propertyIntegerRanges?.get(
                    param.name,
                  );

                  // Check type mismatch separately from enum/range validation
                  const isTypeValid = isValidPropertyValue(
                    param.value,
                    expectedType,
                  );
                  const isEnumOrRangeValid =
                    enumValues || integerRange
                      ? isValidPropertyValue(
                          param.value,
                          expectedType,
                          enumValues,
                          integerRange,
                        )
                      : true;

                  if (!isTypeValid) {
                    // Type mismatch (not enum/range issue)
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_TYPE,
                        param.name,
                        annotation.name,
                        expectedType,
                      ),
                      location: annotation.location,
                      code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_TYPE,
                    });
                  } else if (!isEnumOrRangeValid) {
                    // Enum/range validation failure
                    if (enumValues) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED,
                          trimmedValue,
                          param.name,
                          annotation.name,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED,
                      });
                    } else {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_INVALID_VALUE,
                          param.name,
                          expectedType,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_VALUE,
                      });
                    }
                  }
                }

                // Format validation (for string properties)
                if (expectedType === 'string') {
                  // Check for invalid string values (blacklist)
                  const invalidValues =
                    propertyInfo.propertyInvalidStringValues?.get(param.name);
                  if (invalidValues && invalidValues.length > 0) {
                    // Case-insensitive comparison
                    if (
                      invalidValues.some(
                        (invalid) =>
                          invalid.toLowerCase() === trimmedValue.toLowerCase(),
                      )
                    ) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_BAD_STRING_VALUE,
                          param.name,
                          annotation.name,
                          trimmedValue,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_BAD_STRING_VALUE,
                      });
                      continue; // Skip further validation for this property
                    }
                  }

                  const formatValidator =
                    propertyInfo.propertyFormatValidators?.get(param.name);
                  if (formatValidator) {
                    // Strip quotes for format validation (already done above)
                    const formatErrorCode = formatValidator(
                      trimmedValue,
                      param.name,
                    );
                    if (formatErrorCode) {
                      // Use specific error code if provided, otherwise use generic format error
                      if (
                        formatErrorCode ===
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME
                      ) {
                        errors.push({
                          message: localizeTyped(formatErrorCode, trimmedValue),
                          location: annotation.location,
                          code: formatErrorCode,
                        });
                      } else if (
                        formatErrorCode ===
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME
                      ) {
                        errors.push({
                          message: localizeTyped(
                            formatErrorCode,
                            param.name,
                            trimmedValue,
                          ),
                          location: annotation.location,
                          code: formatErrorCode,
                        });
                      } else {
                        // Generic format error
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_INVALID_FORMAT,
                            param.name,
                            annotation.name,
                          ),
                          location: annotation.location,
                          code: formatErrorCode,
                        });
                      }
                      continue; // Skip further validation for this property
                    }
                  }
                }

                // Numeric comparison validation (for number properties)
                if (expectedType === 'number') {
                  const numericComparison =
                    propertyInfo.propertyNumericComparisons?.get(param.name);
                  if (numericComparison) {
                    // Parse numeric value (already validated as number type above)
                    let unquotedValue = trimmedValue;
                    if (
                      (unquotedValue.startsWith("'") &&
                        unquotedValue.endsWith("'")) ||
                      (unquotedValue.startsWith('"') &&
                        unquotedValue.endsWith('"'))
                    ) {
                      unquotedValue = unquotedValue.slice(1, -1);
                    }
                    const numValue = Number(unquotedValue);
                    if (!isNaN(numValue)) {
                      if (
                        numericComparison.operator === '>=' &&
                        numValue < numericComparison.value
                      ) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL,
                            param.name,
                            annotation.name,
                            numericComparison.value.toString(),
                            numValue.toString(),
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL,
                        });
                        continue; // Skip further validation for this property
                      } else if (
                        numericComparison.operator === '<=' &&
                        numValue > numericComparison.value
                      ) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL,
                            param.name,
                            annotation.name,
                            numericComparison.value.toString(),
                            numValue.toString(),
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL,
                        });
                        continue; // Skip further validation for this property
                      }
                    }
                  }
                }

                // Only perform version checks if version-specific validation is enabled
                if (options.enableVersionSpecificValidation) {
                  const minVersion = propertyInfo.propertyMinVersions?.get(
                    param.name,
                  );
                  const maxVersion = propertyInfo.propertyMaxVersions?.get(
                    param.name,
                  );

                  if (minVersion !== undefined) {
                    if (!isVersionAtLeast(options.apiVersion, minVersion)) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_MIN_VERSION,
                          param.name,
                          annotation.name,
                          `${minVersion}.0`,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_MIN_VERSION,
                      });
                      continue; // Skip further validation for this property
                    }
                  }

                  if (maxVersion !== undefined) {
                    if (!isVersionAtMost(options.apiVersion, maxVersion)) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_MAX_VERSION,
                          param.name,
                          annotation.name,
                          `${maxVersion}.0`,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_MAX_VERSION,
                      });
                      continue; // Skip further validation for this property
                    }
                  }
                }
              }
            }

            // Validate @JsonAccess requires at least one control parameter
            if (annotationNameLower === 'jsonaccess') {
              const serializable = getAnnotationParameter(
                annotation,
                'serializable',
              );
              const deserializable = getAnnotationParameter(
                annotation,
                'deserializable',
              );

              if (serializable === undefined && deserializable === undefined) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
                  ),
                  location: annotation.location,
                  code: ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
                });
              }
            }

            // TIER 1: Format validation for testFor property
            if (annotationNameLower === 'istest') {
              const testForParam = getAnnotationParameter(
                annotation,
                'testFor',
              );

              if (testForParam) {
                const parseResult = parseTestForValue(testForParam);

                // Report format validation errors (TIER 1)
                for (const formatError of parseResult.errors) {
                  errors.push({
                    message: formatError.message,
                    location: annotation.location,
                    code: formatError.code as any,
                  });
                }

                // TIER 2: Cross-file type resolution (only if format is valid)
                if (
                  parseResult.errors.length === 0 &&
                  parseResult.references.length > 0 &&
                  options.tier === ValidationTier.THOROUGH &&
                  options.symbolManager
                ) {
                  const resolutionResults = yield* resolveTestForTypes(
                    parseResult.references,
                    options.symbolManager,
                    options,
                  ) as Effect.Effect<
                    Map<string, { found: boolean; kind: SymbolKind | null }>,
                    never,
                    never
                  >;

                  for (const ref of parseResult.references) {
                    const result = resolutionResults.get(ref.typeName);
                    if (result && !result.found) {
                      const typeKind =
                        ref.prefix === 'ApexClass' ? 'Class' : 'Trigger';
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
                          'testFor',
                          typeKind,
                          ref.typeName,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
                      });
                    }
                  }
                }
              }

              // @isTest on class with @TestSetup methods: cannot have seeAllData
              // Check if there are any @TestSetup methods in the file
              // (TIER 1: same-file only, so all methods belong to classes in this file)
              const allMethods = allSymbols.filter(
                (symbol): symbol is MethodSymbol =>
                  symbol.kind === SymbolKind.Method && 'parameters' in symbol,
              );
              const hasTestSetupMethods = allMethods.some((method) =>
                method.annotations?.some(
                  (ann) => ann.name.toLowerCase() === 'testsetup',
                ),
              );

              if (hasTestSetupMethods) {
                const seeAllDataValue = getAnnotationParameter(
                  annotation,
                  'seeAllData',
                );
                if (seeAllDataValue?.toLowerCase() === 'true') {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.TEST_SETUP_CANNOT_HAVE_DEFINING_TYPE_SEE_ALL_DATA,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.TEST_SETUP_CANNOT_HAVE_DEFINING_TYPE_SEE_ALL_DATA,
                  });
                }
              }
            }
          }
        }
      }

      // Validate @InvocableMethod methods
      const methods = allSymbols.filter(
        (symbol): symbol is MethodSymbol =>
          symbol.kind === SymbolKind.Method && 'parameters' in symbol,
      );

      for (const method of methods) {
        // General annotation property validation for method annotations
        if (method.annotations) {
          for (const annotation of method.annotations) {
            const baseName = getBaseAnnotationName(annotation.name);
            const annotationNameLower = baseName.toLowerCase();
            const propertyInfo =
              ANNOTATION_PROPERTY_REGISTRY.get(annotationNameLower);

            if (propertyInfo) {
              const paramNames = getAnnotationParameterNames(annotation);

              // Check for duplicate parameters
              const seenNames = new Set<string>();
              for (const paramName of paramNames) {
                const paramNameLower = paramName.toLowerCase();
                if (seenNames.has(paramNameLower)) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER,
                      paramName,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER,
                  });
                } else {
                  seenNames.add(paramNameLower);
                }
              }

              // Check sibling property restrictions (invalid combinations)
              if (propertyInfo.propertySiblingRestrictions) {
                for (const [
                  prop1,
                  prop2,
                ] of propertyInfo.propertySiblingRestrictions) {
                  const hasProp1 = paramNames.some(
                    (name) => name.toLowerCase() === prop1.toLowerCase(),
                  );
                  const hasProp2 = paramNames.some(
                    (name) => name.toLowerCase() === prop2.toLowerCase(),
                  );
                  if (hasProp1 && hasProp2) {
                    // Special handling for @isTest: isParallel + seeAllData
                    if (
                      annotationNameLower === 'istest' &&
                      prop1.toLowerCase() === 'isparallel' &&
                      prop2.toLowerCase() === 'seealldata'
                    ) {
                      // Check if both are set to true
                      const isParallelValue = getAnnotationParameter(
                        annotation,
                        'isParallel',
                      );
                      const seeAllDataValue = getAnnotationParameter(
                        annotation,
                        'seeAllData',
                      );
                      if (
                        isParallelValue?.toLowerCase() === 'true' &&
                        seeAllDataValue?.toLowerCase() === 'true'
                      ) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.PARALLEL_TEST_METHOD_CANNOT_HAVE_SEE_ALL_DATA,
                          ),
                          location: annotation.location,
                          code: ErrorCodes.PARALLEL_TEST_METHOD_CANNOT_HAVE_SEE_ALL_DATA,
                        });
                      }
                    } else {
                      // Generic sibling restriction error
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_SIBLING_INVALID_VALUE,
                          prop1,
                          prop2,
                          annotation.name,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_SIBLING_INVALID_VALUE,
                      });
                    }
                  }
                }
              }

              // @isTest on @TestSetup methods: cannot have seeAllData
              if (
                annotationNameLower === 'istest' &&
                method.annotations?.some(
                  (ann) => ann.name.toLowerCase() === 'testsetup',
                )
              ) {
                const seeAllDataValue = getAnnotationParameter(
                  annotation,
                  'seeAllData',
                );
                if (seeAllDataValue?.toLowerCase() === 'true') {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.TEST_SETUP_CANNOT_HAVE_SEE_ALL_DATA,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.TEST_SETUP_CANNOT_HAVE_SEE_ALL_DATA,
                  });
                }
              }

              // Check target-specific restrictions (for method annotations)
              if (
                propertyInfo.propertyAllowedTargets &&
                annotation.parameters
              ) {
                for (const param of annotation.parameters) {
                  if (!param.name) {
                    continue;
                  }
                  const allowedTargets =
                    propertyInfo.propertyAllowedTargets.get(param.name);
                  if (allowedTargets && allowedTargets.length > 0) {
                    const symbolKind = SymbolKind.Method;
                    if (!allowedTargets.includes(symbolKind)) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_IS_NOT_ALLOWED,
                          param.name,
                          annotation.name,
                          'method',
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_IS_NOT_ALLOWED,
                      });
                    }
                  }
                }
              }

              // Check for missing required properties
              if (propertyInfo.requiredProperties) {
                for (const requiredProp of propertyInfo.requiredProperties) {
                  if (
                    !paramNames.some(
                      (name) =>
                        name.toLowerCase() === requiredProp.toLowerCase(),
                    )
                  ) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.ANNOTATION_PROPERTY_MISSING,
                        requiredProp,
                      ),
                      location: annotation.location,
                      code: ErrorCodes.ANNOTATION_PROPERTY_MISSING,
                    });
                  }
                }
              }

              // Check for unsupported properties
              const allSupportedProperties = [
                ...(propertyInfo.requiredProperties || []),
                ...(propertyInfo.optionalProperties || []),
              ];
              for (const paramName of paramNames) {
                if (
                  !allSupportedProperties.some(
                    (supported) =>
                      supported.toLowerCase() === paramName.toLowerCase(),
                  )
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED,
                      paramName,
                      annotation.name,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED,
                  });
                }
              }

              // Check for invalid property values
              if (propertyInfo.propertyValueTypes && annotation.parameters) {
                for (let i = 0; i < annotation.parameters.length; i++) {
                  const param = annotation.parameters[i];
                  if (param.value === undefined || param.value === null) {
                    continue;
                  }
                  // Map positional parameters to 'value' (first positional = 'value')
                  const paramName =
                    param.name || (i === 0 ? 'value' : undefined);
                  if (!paramName) {
                    continue;
                  }

                  // Check for empty property values
                  let trimmedValue = param.value.trim();
                  // Strip surrounding quotes
                  if (
                    (trimmedValue.startsWith("'") &&
                      trimmedValue.endsWith("'")) ||
                    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
                  ) {
                    trimmedValue = trimmedValue.slice(1, -1);
                  }

                  if (trimmedValue.length === 0) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.ANNOTATION_PROPERTY_CANNOT_BE_EMPTY,
                        paramName,
                      ),
                      location: annotation.location,
                      code: ErrorCodes.ANNOTATION_PROPERTY_CANNOT_BE_EMPTY,
                    });
                    continue; // Skip further validation for empty values
                  }

                  // API version format validation for apiVersion, minVersion, maxVersion, added, removed
                  if (
                    API_VERSION_FORMAT_PROPERTIES.has(paramName.toLowerCase())
                  ) {
                    const apiVersionError =
                      validateAPIVersionFormat(trimmedValue);
                    if (apiVersionError) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION,
                          paramName,
                          annotation.name,
                          trimmedValue,
                        ),
                        location: annotation.location,
                        code: apiVersionError,
                      });
                      continue;
                    }
                  }

                  const expectedType =
                    propertyInfo.propertyValueTypes.get(paramName);
                  if (expectedType) {
                    const enumValues =
                      propertyInfo.propertyEnumValues?.get(paramName);
                    const integerRange =
                      propertyInfo.propertyIntegerRanges?.get(paramName);

                    // Check type mismatch separately from enum/range validation
                    const isTypeValid = isValidPropertyValue(
                      param.value,
                      expectedType,
                    );
                    const isEnumOrRangeValid =
                      enumValues || integerRange
                        ? isValidPropertyValue(
                            param.value,
                            expectedType,
                            enumValues,
                            integerRange,
                          )
                        : true;

                    if (!isTypeValid) {
                      // Type mismatch (not enum/range issue)
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_INVALID_TYPE,
                          paramName,
                          annotation.name,
                          expectedType,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_TYPE,
                      });
                    } else if (!isEnumOrRangeValid) {
                      // Enum/range validation failure
                      if (enumValues) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED,
                            trimmedValue,
                            paramName,
                            annotation.name,
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED,
                        });
                      } else {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_INVALID_VALUE,
                            paramName,
                            expectedType,
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_VALUE,
                        });
                      }
                    }
                  }

                  // Format validation (for string properties)
                  if (expectedType === 'string') {
                    const formatValidator =
                      propertyInfo.propertyFormatValidators?.get(paramName);
                    if (formatValidator) {
                      // Strip quotes for format validation (already done above)
                      const formatErrorCode = formatValidator(
                        trimmedValue,
                        paramName,
                      );
                      if (formatErrorCode) {
                        // Use specific error code if provided, otherwise use generic format error
                        if (
                          formatErrorCode ===
                          ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME
                        ) {
                          errors.push({
                            message: localizeTyped(
                              formatErrorCode,
                              trimmedValue,
                            ),
                            location: annotation.location,
                            code: formatErrorCode,
                          });
                        } else if (
                          formatErrorCode ===
                          ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME
                        ) {
                          errors.push({
                            message: localizeTyped(
                              formatErrorCode,
                              paramName,
                              trimmedValue,
                            ),
                            location: annotation.location,
                            code: formatErrorCode,
                          });
                        } else {
                          // Generic format error
                          errors.push({
                            message: localizeTyped(
                              ErrorCodes.ANNOTATION_PROPERTY_INVALID_FORMAT,
                              paramName,
                              annotation.name,
                            ),
                            location: annotation.location,
                            code: formatErrorCode,
                          });
                        }
                        continue; // Skip further validation for this property
                      }
                    }
                  }

                  // Only perform version checks if version-specific validation is enabled
                  if (options.enableVersionSpecificValidation) {
                    const minVersion =
                      propertyInfo.propertyMinVersions?.get(paramName);
                    const maxVersion =
                      propertyInfo.propertyMaxVersions?.get(paramName);

                    if (minVersion !== undefined) {
                      if (!isVersionAtLeast(options.apiVersion, minVersion)) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_MIN_VERSION,
                            paramName,
                            annotation.name,
                            `${minVersion}.0`,
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_MIN_VERSION,
                        });
                        continue; // Skip further validation for this property
                      }
                    }

                    if (maxVersion !== undefined) {
                      if (!isVersionAtMost(options.apiVersion, maxVersion)) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_MAX_VERSION,
                            paramName,
                            annotation.name,
                            `${maxVersion}.0`,
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_MAX_VERSION,
                        });
                        continue; // Skip further validation for this property
                      }
                    }
                  }
                }
              }

              // Validate @JsonAccess requires at least one control parameter
              if (annotationNameLower === 'jsonaccess') {
                const serializable = getAnnotationParameter(
                  annotation,
                  'serializable',
                );
                const deserializable = getAnnotationParameter(
                  annotation,
                  'deserializable',
                );

                if (
                  serializable === undefined &&
                  deserializable === undefined
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
                  });
                }
              }

              // TIER 1: Format validation for testFor property (on methods)
              if (annotationNameLower === 'istest') {
                const testForParam = getAnnotationParameter(
                  annotation,
                  'testFor',
                );

                if (testForParam) {
                  const parseResult = parseTestForValue(testForParam);

                  // Report format validation errors (TIER 1)
                  for (const formatError of parseResult.errors) {
                    errors.push({
                      message: formatError.message,
                      location: annotation.location,
                      code: formatError.code as any,
                    });
                  }

                  // TIER 2: Cross-file type resolution (only if format is valid)
                  if (
                    parseResult.errors.length === 0 &&
                    parseResult.references.length > 0 &&
                    options.tier === ValidationTier.THOROUGH &&
                    options.symbolManager
                  ) {
                    const resolutionResults = yield* resolveTestForTypes(
                      parseResult.references,
                      options.symbolManager,
                      options,
                    ) as Effect.Effect<
                      Map<string, { found: boolean; kind: SymbolKind | null }>,
                      never,
                      never
                    >;

                    for (const ref of parseResult.references) {
                      const result = resolutionResults.get(ref.typeName);
                      if (result && !result.found) {
                        const typeKind =
                          ref.prefix === 'ApexClass' ? 'Class' : 'Trigger';
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
                            'testFor',
                            typeKind,
                            ref.typeName,
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
        const invocableAnnotation = getAnnotation(method, 'InvocableMethod');
        if (!invocableAnnotation) {
          continue;
        }

        // Check parameter count - must have exactly one parameter
        const paramCount = method.parameters?.length || 0;
        if (paramCount !== 1) {
          const code = ErrorCodes.INVOCABLE_METHOD_SINGLE_PARAM;
          errors.push({
            message: localizeTyped(code),
            location: method.location,
            code,
          });
          continue; // Skip further validation if parameter count is wrong
        }

        // Check parameter type - must be a List type
        const param = method.parameters[0];
        if (param && param.type) {
          const typeName = param.type.name?.toLowerCase() || '';
          const originalTypeString =
            param.type.originalTypeString?.toLowerCase() || '';

          // Check if it's a List type (List<T> or List)
          const isListType =
            typeName === 'list' ||
            originalTypeString.startsWith('list<') ||
            originalTypeString === 'list';

          if (!isListType) {
            const code = ErrorCodes.INVOCABLE_METHOD_NON_LIST_PARAMETER;
            const typeDisplayName =
              param.type.originalTypeString || param.type.name || 'unknown';
            errors.push({
              message: localizeTyped(code, typeDisplayName),
              location: param.location,
              code,
            });
          }
        }

        // Check that @InvocableMethod can only have @Deprecated as additional annotation
        if (method.annotations && method.annotations.length > 1) {
          const otherAnnotations = method.annotations.filter((ann) => {
            const baseName = getBaseAnnotationName(ann.name);
            const baseNameLower = baseName.toLowerCase();
            return (
              baseNameLower !== 'invocablemethod' &&
              baseNameLower !== 'deprecated'
            );
          });

          if (otherAnnotations.length > 0) {
            const code = ErrorCodes.INVOCABLE_METHOD_CAN_ONLY_HAVE_DEPRECATED;
            // Report error on the first non-InvocableMethod, non-Deprecated annotation
            const invalidAnnotation = otherAnnotations[0];
            errors.push({
              message: localizeTyped(code),
              location: invalidAnnotation.location,
              code,
            });
          }
        }
      }

      // Validate field and property annotations
      const fieldsAndProperties = allSymbols.filter(
        (symbol) =>
          (symbol.kind === SymbolKind.Field ||
            symbol.kind === SymbolKind.Property) &&
          'annotations' in symbol,
      );

      for (const fieldOrProperty of fieldsAndProperties) {
        if (!fieldOrProperty.annotations) {
          continue;
        }

        // General annotation property validation for field/property annotations
        for (const annotation of fieldOrProperty.annotations) {
          const baseName = getBaseAnnotationName(annotation.name);
          const annotationNameLower = baseName.toLowerCase();
          const propertyInfo =
            ANNOTATION_PROPERTY_REGISTRY.get(annotationNameLower);

          if (propertyInfo) {
            const paramNames = getAnnotationParameterNames(annotation);

            // Check for duplicate parameters
            const seenNames = new Set<string>();
            for (const paramName of paramNames) {
              const paramNameLower = paramName.toLowerCase();
              if (seenNames.has(paramNameLower)) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER,
                    paramName,
                  ),
                  location: annotation.location,
                  code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER,
                });
              } else {
                seenNames.add(paramNameLower);
              }
            }

            // Check for missing required properties
            if (propertyInfo.requiredProperties) {
              for (const requiredProp of propertyInfo.requiredProperties) {
                if (
                  !paramNames.some(
                    (name) => name.toLowerCase() === requiredProp.toLowerCase(),
                  )
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.ANNOTATION_PROPERTY_MISSING,
                      requiredProp,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.ANNOTATION_PROPERTY_MISSING,
                  });
                }
              }
            }

            // Check for unsupported properties
            const allSupportedProperties = [
              ...(propertyInfo.requiredProperties || []),
              ...(propertyInfo.optionalProperties || []),
            ];
            for (const paramName of paramNames) {
              if (
                !allSupportedProperties.some(
                  (supported) =>
                    supported.toLowerCase() === paramName.toLowerCase(),
                )
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED,
                    paramName,
                    annotation.name,
                  ),
                  location: annotation.location,
                  code: ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED,
                });
              }
            }

            // Check for invalid property values
            if (propertyInfo.propertyValueTypes && annotation.parameters) {
              for (const param of annotation.parameters) {
                if (
                  !param.name ||
                  param.value === undefined ||
                  param.value === null
                ) {
                  continue;
                }

                // Check for empty property values
                let trimmedValue = param.value.trim();
                // Strip surrounding quotes
                if (
                  (trimmedValue.startsWith("'") &&
                    trimmedValue.endsWith("'")) ||
                  (trimmedValue.startsWith('"') && trimmedValue.endsWith('"'))
                ) {
                  trimmedValue = trimmedValue.slice(1, -1);
                }

                if (trimmedValue.length === 0) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.ANNOTATION_PROPERTY_CANNOT_BE_EMPTY,
                      param.name,
                    ),
                    location: annotation.location,
                    code: ErrorCodes.ANNOTATION_PROPERTY_CANNOT_BE_EMPTY,
                  });
                  continue; // Skip further validation for empty values
                }

                // API version format validation for apiVersion, minVersion, maxVersion, added, removed
                if (
                  API_VERSION_FORMAT_PROPERTIES.has(param.name.toLowerCase())
                ) {
                  const apiVersionError =
                    validateAPIVersionFormat(trimmedValue);
                  if (apiVersionError) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION,
                        param.name,
                        annotation.name,
                        trimmedValue,
                      ),
                      location: annotation.location,
                      code: apiVersionError,
                    });
                    continue;
                  }
                }

                const expectedType = propertyInfo.propertyValueTypes.get(
                  param.name,
                );
                if (expectedType) {
                  const enumValues = propertyInfo.propertyEnumValues?.get(
                    param.name,
                  );
                  const integerRange = propertyInfo.propertyIntegerRanges?.get(
                    param.name,
                  );

                  // Check type mismatch separately from enum/range validation
                  const isTypeValid = isValidPropertyValue(
                    param.value,
                    expectedType,
                  );
                  const isEnumOrRangeValid =
                    enumValues || integerRange
                      ? isValidPropertyValue(
                          param.value,
                          expectedType,
                          enumValues,
                          integerRange,
                        )
                      : true;

                  if (!isTypeValid) {
                    // Type mismatch (not enum/range issue)
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_TYPE,
                        param.name,
                        annotation.name,
                        expectedType,
                      ),
                      location: annotation.location,
                      code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_TYPE,
                    });
                  } else if (!isEnumOrRangeValid) {
                    // Enum/range validation failure
                    if (enumValues) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED,
                          trimmedValue,
                          param.name,
                          annotation.name,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED,
                      });
                    } else {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_INVALID_VALUE,
                          param.name,
                          expectedType,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_INVALID_VALUE,
                      });
                    }
                  }
                }

                // Format validation (for string properties)
                if (expectedType === 'string') {
                  // Check for invalid string values (blacklist)
                  const invalidValues =
                    propertyInfo.propertyInvalidStringValues?.get(param.name);
                  if (invalidValues && invalidValues.length > 0) {
                    // Case-insensitive comparison
                    if (
                      invalidValues.some(
                        (invalid) =>
                          invalid.toLowerCase() === trimmedValue.toLowerCase(),
                      )
                    ) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_BAD_STRING_VALUE,
                          param.name,
                          annotation.name,
                          trimmedValue,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_BAD_STRING_VALUE,
                      });
                      continue; // Skip further validation for this property
                    }
                  }

                  const formatValidator =
                    propertyInfo.propertyFormatValidators?.get(param.name);
                  if (formatValidator) {
                    // Strip quotes for format validation (already done above)
                    const formatErrorCode = formatValidator(
                      trimmedValue,
                      param.name,
                    );
                    if (formatErrorCode) {
                      // Use specific error code if provided, otherwise use generic format error
                      if (
                        formatErrorCode ===
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME
                      ) {
                        errors.push({
                          message: localizeTyped(formatErrorCode, trimmedValue),
                          location: annotation.location,
                          code: formatErrorCode,
                        });
                      } else if (
                        formatErrorCode ===
                        ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME
                      ) {
                        errors.push({
                          message: localizeTyped(
                            formatErrorCode,
                            param.name,
                            trimmedValue,
                          ),
                          location: annotation.location,
                          code: formatErrorCode,
                        });
                      } else {
                        // Generic format error
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_INVALID_FORMAT,
                            param.name,
                            annotation.name,
                          ),
                          location: annotation.location,
                          code: formatErrorCode,
                        });
                      }
                      continue; // Skip further validation for this property
                    }
                  }
                }

                // Numeric comparison validation (for number properties)
                if (expectedType === 'number') {
                  const numericComparison =
                    propertyInfo.propertyNumericComparisons?.get(param.name);
                  if (numericComparison) {
                    // Parse numeric value (already validated as number type above)
                    let unquotedValue = trimmedValue;
                    if (
                      (unquotedValue.startsWith("'") &&
                        unquotedValue.endsWith("'")) ||
                      (unquotedValue.startsWith('"') &&
                        unquotedValue.endsWith('"'))
                    ) {
                      unquotedValue = unquotedValue.slice(1, -1);
                    }
                    const numValue = Number(unquotedValue);
                    if (!isNaN(numValue)) {
                      if (
                        numericComparison.operator === '>=' &&
                        numValue < numericComparison.value
                      ) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL,
                            param.name,
                            annotation.name,
                            numericComparison.value.toString(),
                            numValue.toString(),
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL,
                        });
                        continue; // Skip further validation for this property
                      } else if (
                        numericComparison.operator === '<=' &&
                        numValue > numericComparison.value
                      ) {
                        errors.push({
                          message: localizeTyped(
                            ErrorCodes.ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL,
                            param.name,
                            annotation.name,
                            numericComparison.value.toString(),
                            numValue.toString(),
                          ),
                          location: annotation.location,
                          code: ErrorCodes.ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL,
                        });
                        continue; // Skip further validation for this property
                      }
                    }
                  }
                }

                // Only perform version checks if version-specific validation is enabled
                if (options.enableVersionSpecificValidation) {
                  const minVersion = propertyInfo.propertyMinVersions?.get(
                    param.name,
                  );
                  const maxVersion = propertyInfo.propertyMaxVersions?.get(
                    param.name,
                  );

                  if (minVersion !== undefined) {
                    if (!isVersionAtLeast(options.apiVersion, minVersion)) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_MIN_VERSION,
                          param.name,
                          annotation.name,
                          `${minVersion}.0`,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_MIN_VERSION,
                      });
                      continue; // Skip further validation for this property
                    }
                  }

                  if (maxVersion !== undefined) {
                    if (!isVersionAtMost(options.apiVersion, maxVersion)) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_MAX_VERSION,
                          param.name,
                          annotation.name,
                          `${maxVersion}.0`,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_MAX_VERSION,
                      });
                      continue; // Skip further validation for this property
                    }
                  }
                }
              }
            }

            // Validate @JsonAccess requires at least one control parameter
            if (annotationNameLower === 'jsonaccess') {
              const serializable = getAnnotationParameter(
                annotation,
                'serializable',
              );
              const deserializable = getAnnotationParameter(
                annotation,
                'deserializable',
              );

              if (serializable === undefined && deserializable === undefined) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
                  ),
                  location: annotation.location,
                  code: ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
                });
              }
            }

            // TIER 1: Format validation for testFor property (on fields/properties)
            if (annotationNameLower === 'istest') {
              const testForParam = getAnnotationParameter(
                annotation,
                'testFor',
              );

              if (testForParam) {
                const parseResult = parseTestForValue(testForParam);

                // Report format validation errors (TIER 1)
                for (const formatError of parseResult.errors) {
                  errors.push({
                    message: formatError.message,
                    location: annotation.location,
                    code: formatError.code as any,
                  });
                }

                // TIER 2: Cross-file type resolution (only if format is valid)
                if (
                  parseResult.errors.length === 0 &&
                  parseResult.references.length > 0 &&
                  options.tier === ValidationTier.THOROUGH &&
                  options.symbolManager
                ) {
                  const resolutionResults = yield* resolveTestForTypes(
                    parseResult.references,
                    options.symbolManager,
                    options,
                  ) as Effect.Effect<
                    Map<string, { found: boolean; kind: SymbolKind | null }>,
                    never,
                    never
                  >;

                  for (const ref of parseResult.references) {
                    const result = resolutionResults.get(ref.typeName);
                    if (result && !result.found) {
                      const typeKind =
                        ref.prefix === 'ApexClass' ? 'Class' : 'Trigger';
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
                          'testFor',
                          typeKind,
                          ref.typeName,
                        ),
                        location: annotation.location,
                        code: ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      yield* Effect.logDebug(
        `AnnotationPropertyValidator: checked ${classes.length} classes, ` +
          `${methods.length} methods, and ${fieldsAndProperties.length} fields/properties, ` +
          `found ${errors.length} annotation property violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
