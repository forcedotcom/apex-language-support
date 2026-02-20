/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type {
  SymbolTable,
  ApexSymbol,
  TypeSymbol,
  ScopeSymbol,
  MethodSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
import { isMethodSymbol, isBlockSymbol } from '../../../utils/symbolNarrowing';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped, localize } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import type {
  UnitType,
  AnnotationElementKind,
} from './annotationModifierRules';
import {
  ANNOTATION_ALLOWED_UNIT_TYPES,
  ANNOTATION_REQUIRED_DEFINING_MODIFIERS,
  ANNOTATION_MIN_VERSIONS,
} from './annotationModifierRules';

/**
 * Check if a symbol is an inner type (class, interface, enum)
 */
function isInnerType(symbol: ApexSymbol): boolean {
  return (
    (symbol.kind === SymbolKind.Class ||
      symbol.kind === SymbolKind.Interface ||
      symbol.kind === SymbolKind.Enum) &&
    symbol.parentId !== null
  );
}

/**
 * Find the containing class for a method or property symbol
 */
function findContainingClass(
  symbol: ApexSymbol,
  allSymbols: ApexSymbol[],
): TypeSymbol | undefined {
  let parentClass: TypeSymbol | undefined = allSymbols.find(
    (s) => s.id === symbol.parentId && s.kind === SymbolKind.Class,
  ) as TypeSymbol | undefined;

  if (!parentClass) {
    const block = allSymbols.find(
      (s) => isBlockSymbol(s) && s.id === symbol.parentId,
    ) as ScopeSymbol | undefined;
    if (block && block.scopeType === 'class') {
      parentClass = allSymbols.find(
        (s) => s.id === block.parentId && s.kind === SymbolKind.Class,
      ) as TypeSymbol | undefined;
    }
  }
  return parentClass;
}

/**
 * Find the containing type (class, interface, enum, or trigger) for a symbol.
 * Used for MODIFIER_ILLEGAL_DEFINING_TYPE and MODIFIER_ILLEGAL_DEFINING_TYPE_FOR.
 */
function findContainingType(
  symbol: ApexSymbol,
  allSymbols: ApexSymbol[],
): TypeSymbol | undefined {
  const typeKinds = [
    SymbolKind.Class,
    SymbolKind.Interface,
    SymbolKind.Enum,
    SymbolKind.Trigger,
  ];
  let parent = allSymbols.find(
    (s) => s.id === symbol.parentId && typeKinds.includes(s.kind),
  ) as TypeSymbol | undefined;
  if (!parent) {
    const block = allSymbols.find(
      (s) => isBlockSymbol(s) && s.id === symbol.parentId,
    ) as ScopeSymbol | undefined;
    if (block && block.scopeType === 'class') {
      parent = allSymbols.find(
        (s) => s.id === block.parentId && typeKinds.includes(s.kind),
      ) as TypeSymbol | undefined;
    }
  }
  return parent;
}

/**
 * Get the unit type for a type symbol (used for MODIFIER_ILLEGAL_DEFINING_TYPE)
 */
function getUnitTypeForSymbol(
  typeSymbol: TypeSymbol,
  fileUri: string,
): UnitType {
  if (typeSymbol.kind === SymbolKind.Trigger) return 'TRIGGER';
  if (typeSymbol.kind === SymbolKind.Interface) return 'INTERFACE';
  if (typeSymbol.kind === SymbolKind.Enum) return 'ENUM';
  if (typeSymbol.kind === SymbolKind.Class) return 'CLASS';
  if (fileUri.endsWith('.trigger')) return 'TRIGGER';
  if (fileUri.endsWith('.apex')) return 'ANONYMOUS';
  return 'CLASS';
}

/**
 * Get element kind for annotation min version (symbol kind -> AnnotationElementKind)
 */
function getElementKindForSymbol(symbol: ApexSymbol): AnnotationElementKind {
  switch (symbol.kind) {
    case SymbolKind.Method:
      return 'METHOD';
    case SymbolKind.Constructor:
      return 'CONSTRUCTOR';
    case SymbolKind.Field:
      return 'FIELD';
    case SymbolKind.Property:
      return 'PROPERTY';
    case SymbolKind.Class:
      return 'CLASS';
    case SymbolKind.Interface:
      return 'INTERFACE';
    case SymbolKind.Enum:
      return 'ENUM';
    default:
      return 'METHOD';
  }
}

/**
 * Check if defining type has required modifiers for an annotation
 */
function hasRequiredDefiningModifiers(
  containingType: TypeSymbol,
  required: ReadonlyArray<string>,
): boolean {
  for (const req of required) {
    if (req === 'isTest') {
      const hasIsTest =
        containingType.modifiers?.isTestMethod === true ||
        containingType.annotations?.some(
          (a) => a.name.toLowerCase() === 'istest',
        );
      if (hasIsTest) return true;
    } else if (req === 'global') {
      if (containingType.modifiers?.visibility === SymbolVisibility.Global)
        return true;
    } else if (req === 'RestResource') {
      const hasRestResource = containingType.annotations?.some(
        (a) => a.name.toLowerCase() === 'restresource',
      );
      if (hasRestResource) return true;
    } else if (req === 'namespaceAccessibleOrGlobal') {
      if (containingType.modifiers?.visibility === SymbolVisibility.Global)
        return true;
      const hasNamespaceAccessible = containingType.annotations?.some(
        (a) => a.name.toLowerCase() === 'namespaceaccessible',
      );
      if (hasNamespaceAccessible) return true;
    }
  }
  return false;
}

/**
 * Get the symbol kind name for error messages (singular)
 */
function getSymbolKindName(kind: SymbolKind): string {
  switch (kind) {
    case SymbolKind.Class:
      return 'class';
    case SymbolKind.Interface:
      return 'interface';
    case SymbolKind.Method:
      return 'method';
    case SymbolKind.Field:
      return 'field';
    case SymbolKind.Property:
      return 'property';
    case SymbolKind.Constructor:
      return 'constructor';
    case SymbolKind.Variable:
      return 'variable';
    case SymbolKind.Parameter:
      return 'parameter';
    default:
      return 'symbol';
  }
}

/**
 * Get plural form for type kinds (matches Jorje Element enum -> class.plural etc.)
 * Used for ENCLOSING_TYPE_FOR nested in modifier.requires
 */
function getSymbolKindNamePlural(kind: SymbolKind): string {
  switch (kind) {
    case SymbolKind.Class:
      return localize('class.plural');
    case SymbolKind.Interface:
      return localize('interface.plural');
    case SymbolKind.Enum:
      return localize('enum.plural');
    default:
      return getSymbolKindName(kind);
  }
}

function hasReadOnlyAnnotation(symbol: {
  annotations?: Array<{ name: string }>;
}): boolean {
  return (
    symbol.annotations?.some((ann) => {
      const baseName = ann.name.toLowerCase().split('(')[0].trim();
      return baseName === 'readonly';
    }) ?? false
  );
}

function hasUseReplicaPreferred(symbol: {
  annotations?: Array<{
    name: string;
    parameters?: Array<{ name?: string; value: string }>;
  }>;
}): boolean {
  const readOnlyAnn = symbol.annotations?.find((ann) => {
    const baseName = ann.name.toLowerCase().split('(')[0].trim();
    return baseName === 'readonly';
  });
  if (!readOnlyAnn?.parameters) return false;
  const useReplica = readOnlyAnn.parameters.find(
    (p) => p.name?.toLowerCase() === 'usereplica',
  );
  return useReplica?.value?.toLowerCase().replace(/['"]/g, '') === 'preferred';
}

function isReadOnlyAllowed(
  method: MethodSymbol,
  containingClass: TypeSymbol | undefined,
  allSymbols: ApexSymbol[],
): boolean {
  if (!containingClass) return false;
  const mods = method.modifiers ?? {};
  const anns = method.annotations ?? [];

  if (
    mods.isWebService ||
    anns.some((a) => a.name.toLowerCase() === 'webservice')
  )
    return true;
  if (anns.some((a) => a.name.toLowerCase() === 'remoteaction')) return true;

  if (
    method.name.toLowerCase() === 'execute' &&
    method.parameters?.length === 1
  ) {
    const paramType = method.parameters[0].type?.name?.toLowerCase() ?? '';
    if (
      paramType === 'schedulablecontext' ||
      paramType === 'system.schedulablecontext'
    ) {
      const implementsSchedulable =
        containingClass.interfaces?.some(
          (i) => i.toLowerCase() === 'schedulable',
        ) ?? false;
      if (implementsSchedulable) return true;
    }
  }
  return false;
}

/**
 * Validates modifier combinations and usage.
 *
 * Rules:
 * - Invalid modifier combinations (e.g., abstract + virtual)
 * - Modifiers not allowed on inner types (e.g., global on inner classes)
 * - Conflicting modifiers
 * - Required modifiers missing (e.g., webService requires global)
 *
 * This validator provides comprehensive modifier validation as a second pass,
 * complementing the listener-based validation in modifier validators.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see prioritize-missing-validations.md Phase 2.3
 */
export const ModifierValidator: Validator = {
  id: 'modifier',
  name: 'Modifier Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 10, // Run after MethodOverrideValidator
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

      const allSymbols = symbolTable.getAllSymbols();

      // Check for global modifier on inner types - ENCLOSING_TYPE_FOR
      // Inner type with global requires enclosing type to be global
      if (options.sourceContent) {
        const sourceContent = options.sourceContent;
        const lines = sourceContent.split('\n');

        for (const symbol of allSymbols) {
          if (isInnerType(symbol)) {
            // Check if the source code has "global" before this inner type declaration
            const location = symbol.location;
            if (location && location.symbolRange) {
              const lineIndex = location.symbolRange.startLine - 1;
              if (lineIndex >= 0 && lineIndex < lines.length) {
                const line = lines[lineIndex];
                const symbolNameIndex = line.indexOf(symbol.name);
                if (symbolNameIndex >= 0) {
                  const beforeName = line.substring(0, symbolNameIndex);
                  const globalMatch = beforeName.match(/\bglobal\b/i);
                  if (globalMatch) {
                    // Inner has global - enclosing type must also be global
                    const enclosingType = findContainingType(
                      symbol,
                      allSymbols,
                    );
                    const enclosingHasGlobal =
                      enclosingType?.modifiers?.visibility ===
                      SymbolVisibility.Global;
                    if (!enclosingHasGlobal) {
                      // Jorje nests enclosing.type.for inside modifier.requires for full message
                      const pluralKind = getSymbolKindNamePlural(symbol.kind);
                      const enclosingMsg = localizeTyped(
                        ErrorCodes.ENCLOSING_TYPE_FOR,
                        'global',
                        pluralKind,
                      );
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.MODIFIER_REQUIRES,
                          enclosingMsg,
                          pluralKind,
                          'global',
                        ),
                        location: symbol.location,
                        code: ErrorCodes.ENCLOSING_TYPE_FOR,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      for (const symbol of allSymbols) {
        const modifiers = symbol.modifiers;
        const kind = symbol.kind;
        const kindName = getSymbolKindName(kind);

        // Check 1: Conflicting modifiers (abstract + virtual)
        if (modifiers.isAbstract && modifiers.isVirtual) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.MODIFIER_CANNOT_BE,
              kindName,
              symbol.name,
              'both abstract and virtual',
            ),
            location: symbol.location,
            code: ErrorCodes.MODIFIER_CANNOT_BE,
          });
        }

        // Check 2: Conflicting modifiers (abstract + final)
        if (modifiers.isAbstract && modifiers.isFinal) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.MODIFIER_CANNOT_BE,
              kindName,
              symbol.name,
              'both abstract and final',
            ),
            location: symbol.location,
            code: ErrorCodes.MODIFIER_CANNOT_BE,
          });
        }

        // Check 3: Conflicting modifiers (virtual + final)
        if (modifiers.isVirtual && modifiers.isFinal) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.MODIFIER_CANNOT_BE,
              kindName,
              symbol.name,
              'both virtual and final',
            ),
            location: symbol.location,
            code: ErrorCodes.MODIFIER_CANNOT_BE,
          });
        }

        // Check 4: Modifiers not allowed on inner types
        // Note: global modifier on inner types is checked above via source content scanning
        // because the parser sanitizes it to match the outer class visibility

        // Check 4b: TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL - top-level types need public, global, or @isTest
        // For interfaces, the listener may sanitize Default→Public; use source when available
        if (
          symbol.parentId === null &&
          (kind === SymbolKind.Class ||
            kind === SymbolKind.Interface ||
            kind === SymbolKind.Enum) &&
          symbol.location
        ) {
          let hasPublicOrGlobal =
            modifiers.visibility === SymbolVisibility.Global ||
            modifiers.visibility === SymbolVisibility.Public;
          const hasIsTest =
            modifiers.isTestMethod === true ||
            symbol.annotations?.some((a) => a.name.toLowerCase() === 'istest');

          // Interfaces: listener sanitizes Default to Public; check source for explicit modifier
          if (
            kind === SymbolKind.Interface &&
            hasPublicOrGlobal &&
            options.sourceContent &&
            symbol.location.symbolRange
          ) {
            const lines = options.sourceContent.split('\n');
            const lineIndex = symbol.location.symbolRange.startLine - 1;
            if (lineIndex >= 0 && lineIndex < lines.length) {
              const line = lines[lineIndex];
              const nameIdx = line.indexOf(symbol.name);
              if (nameIdx >= 0) {
                const beforeName = line.substring(0, nameIdx);
                const hasExplicit =
                  /\bpublic\b/i.test(beforeName) ||
                  /\bglobal\b/i.test(beforeName) ||
                  /@istest\b/i.test(beforeName);
                if (!hasExplicit) {
                  hasPublicOrGlobal = false;
                }
              }
            }
          }

          if (!hasPublicOrGlobal && !hasIsTest) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL,
              ),
              location: symbol.location,
              code: ErrorCodes.TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL,
            });
          }
        }

        // Check 4c: TYPE_MUST_BE_TOP_LEVEL - inner class cannot implement Database.Batchable/InboundEmailHandler
        if (
          kind === SymbolKind.Class &&
          symbol.parentId !== null &&
          symbol.location
        ) {
          const interfaces = (symbol as TypeSymbol).interfaces ?? [];
          for (const iface of interfaces) {
            const ifaceLower = iface.toLowerCase().trim();
            const rootType = ifaceLower.split('<')[0].trim();
            if (
              rootType === 'database.batchable' ||
              rootType === 'messaging.inboundemailhandler'
            ) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.TYPE_MUST_BE_TOP_LEVEL,
                  iface,
                ),
                location: symbol.location,
                code: ErrorCodes.TYPE_MUST_BE_TOP_LEVEL,
              });
              break;
            }
          }
        }

        // Check 4d: DEFINING_TYPE_REQUIRES - abstract method in global class must be global (API 14+)
        if (
          kind === SymbolKind.Method &&
          modifiers.isAbstract &&
          symbol.location &&
          options.enableVersionSpecificValidation &&
          (options.apiVersion ?? 0) >= 14
        ) {
          const containingType = findContainingType(symbol, allSymbols);
          if (
            containingType?.kind === SymbolKind.Class &&
            containingType.modifiers?.visibility === SymbolVisibility.Global &&
            modifiers.visibility !== SymbolVisibility.Global
          ) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.DEFINING_TYPE_REQUIRES,
                'global',
                'method must be global',
              ),
              location: symbol.location,
              code: ErrorCodes.DEFINING_TYPE_REQUIRES,
            });
          }
        }

        // Check 4e: API 65+ - abstract/override methods require protected, public, or global
        if (
          kind === SymbolKind.Method &&
          (modifiers.isAbstract || modifiers.isOverride) &&
          symbol.location &&
          options.enableVersionSpecificValidation &&
          (options.apiVersion ?? 0) >= 65
        ) {
          const hasAllowedVisibility =
            modifiers.visibility === SymbolVisibility.Protected ||
            modifiers.visibility === SymbolVisibility.Public ||
            modifiers.visibility === SymbolVisibility.Global;
          if (!hasAllowedVisibility) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_REQUIRE_AT_LEAST,
                'Abstract',
                'methods',
                'global, public, protected',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_REQUIRE_AT_LEAST,
            });
          }
        }

        // Check 5: Required modifiers (webService requires global)
        if (modifiers.isWebService) {
          if (modifiers.visibility !== SymbolVisibility.Global) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_REQUIRES,
                'webService',
                kindName,
                'global',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_REQUIRES,
            });
          }

          // webService also requires global class
          if (kind === SymbolKind.Method || kind === SymbolKind.Property) {
            // Find parent class
            // Methods/properties have parentId pointing to class blocks, not class symbols
            let parentClass: TypeSymbol | undefined;

            // First, try direct match (in case parentId points to class symbol)
            parentClass = allSymbols.find(
              (s) => s.id === symbol.parentId && s.kind === SymbolKind.Class,
            ) as TypeSymbol | undefined;

            // If not found, symbol.parentId points to a class block
            if (!parentClass) {
              const methodBlock = allSymbols.find(
                (s) => isBlockSymbol(s) && s.id === symbol.parentId,
              ) as ScopeSymbol | undefined;

              if (methodBlock && methodBlock.scopeType === 'class') {
                // Class block's parentId points to the class symbol
                parentClass = allSymbols.find(
                  (s) =>
                    s.id === methodBlock.parentId &&
                    s.kind === SymbolKind.Class,
                ) as TypeSymbol | undefined;
              }
            }

            if (
              parentClass &&
              parentClass.modifiers.visibility !== SymbolVisibility.Global
            ) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.MODIFIER_REQUIRES,
                  'webService',
                  kindName,
                  'a global class',
                ),
                location: symbol.location,
                code: ErrorCodes.MODIFIER_REQUIRES,
              });
            }
          }
        }

        // Check 6: Invalid modifier combinations for specific symbol types
        if (kind === SymbolKind.Field || kind === SymbolKind.Property) {
          // Protected only for instance member variables per Apex doc
          if (
            modifiers.visibility === SymbolVisibility.Protected &&
            modifiers.isStatic
          ) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'protected',
                'static variables',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }

          // Check source content for invalid modifiers on fields
          // (parser sanitizes these, so we need to check source directly)
          if (options.sourceContent && kind === SymbolKind.Field) {
            const location = symbol.location;
            if (location && location.symbolRange) {
              const lineIndex = location.symbolRange.startLine - 1;
              const lines = options.sourceContent.split('\n');
              if (lineIndex >= 0 && lineIndex < lines.length) {
                const line = lines[lineIndex];
                const symbolNameIndex = line.indexOf(symbol.name);
                if (symbolNameIndex >= 0) {
                  const beforeName = line.substring(0, symbolNameIndex);

                  // Check for virtual modifier
                  if (beforeName.match(/\bvirtual\b/i)) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                        'virtual',
                        'field',
                      ),
                      location: symbol.location,
                      code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                    });
                  }

                  // Check for abstract modifier
                  if (beforeName.match(/\babstract\b/i)) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                        'abstract',
                        'field',
                      ),
                      location: symbol.location,
                      code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                    });
                  }

                  // Check for override modifier
                  if (beforeName.match(/\boverride\b/i)) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                        'override',
                        'field',
                      ),
                      location: symbol.location,
                      code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                    });
                  }
                }
              }
            }
          }

          // Virtual not allowed on fields (check symbol table as fallback)
          if (modifiers.isVirtual && kind === SymbolKind.Field) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'virtual',
                'field',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }

          // Override not allowed on fields/properties (check symbol table as fallback)
          if (modifiers.isOverride) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'override',
                kindName,
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }

          // Abstract not allowed on fields/properties (check symbol table as fallback)
          if (modifiers.isAbstract) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'abstract',
                kindName,
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }
        }

        // Check 7: Invalid modifiers on methods
        if (isMethodSymbol(symbol) && symbol.kind === SymbolKind.Method) {
          // Protected only for instance methods per Apex doc
          if (
            modifiers.visibility === SymbolVisibility.Protected &&
            modifiers.isStatic
          ) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'protected',
                'static methods',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }

          // Final not allowed on methods (methods are final by default)
          if (modifiers.isFinal) {
            warnings.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_BY_DEFAULT,
                'Methods',
                'final',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_BY_DEFAULT,
            });
          }

          // MODIFIER_NOT_ON_TOP_LEVEL_TYPE: global on method in inner class
          if (modifiers.visibility === SymbolVisibility.Global) {
            const containingClass = findContainingClass(symbol, allSymbols);
            if (containingClass && isInnerType(containingClass)) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.MODIFIER_NOT_ON_TOP_LEVEL_TYPE,
                  'global',
                ),
                location: symbol.location,
                code: ErrorCodes.MODIFIER_NOT_ON_TOP_LEVEL_TYPE,
              });
            }
          }

          // Abstract + override conflict
          if (modifiers.isAbstract && modifiers.isOverride) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_CANNOT_BE,
                'method',
                symbol.name,
                'both abstract and override',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_CANNOT_BE,
            });
          }

          // INVALID_READ_ONLY: Only WebService, RemoteAction, or Schedulable.execute can be ReadOnly
          if (hasReadOnlyAnnotation(symbol)) {
            const containingClass = findContainingClass(symbol, allSymbols);
            if (
              !isReadOnlyAllowed(
                symbol as MethodSymbol,
                containingClass,
                allSymbols,
              )
            ) {
              errors.push({
                message: localizeTyped(ErrorCodes.INVALID_READ_ONLY),
                location: symbol.location,
                code: ErrorCodes.INVALID_READ_ONLY,
              });
            } else if (hasUseReplicaPreferred(symbol)) {
              // USEREPLICA_PREFERRED_MUST_BE_STATIC: useReplica=preferred requires static
              if (!modifiers.isStatic) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.USEREPLICA_PREFERRED_MUST_BE_STATIC,
                  ),
                  location: symbol.location,
                  code: ErrorCodes.USEREPLICA_PREFERRED_MUST_BE_STATIC,
                });
              }
            }
          }
        }

        // Check 8: Invalid modifiers on classes
        if (kind === SymbolKind.Class) {
          // Final redundant on classes (classes are final by default)
          if (modifiers.isFinal) {
            warnings.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_BY_DEFAULT,
                'Classes',
                'final',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_BY_DEFAULT,
            });
          }

          // webService not allowed on classes
          if (modifiers.isWebService) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'webService',
                'class',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }
        }

        // Check 9: Invalid modifiers on interfaces
        if (kind === SymbolKind.Interface) {
          // Final not allowed on interfaces
          if (modifiers.isFinal) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'final',
                'interface',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }

          // Virtual not allowed on interfaces
          if (modifiers.isVirtual) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
                'virtual',
                'interface',
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
            });
          }
        }
      }

      // MODIFIER_ILLEGAL_DEFINING_TYPE, MODIFIER_ILLEGAL_DEFINING_TYPE_FOR, MODIFIER_MIN_VERSION
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';
      for (const symbol of allSymbols) {
        const annotations = symbol.annotations ?? [];
        for (const ann of annotations) {
          const annBaseName = ann.name.toLowerCase().split('(')[0].trim();
          const containingType = findContainingType(symbol, allSymbols);
          const definingUnitType = containingType
            ? getUnitTypeForSymbol(containingType, fileUri)
            : fileUri.endsWith('.trigger')
              ? 'TRIGGER'
              : fileUri.endsWith('.apex')
                ? 'ANONYMOUS'
                : 'CLASS';

          // MODIFIER_ILLEGAL_DEFINING_TYPE: annotation not allowed on this unit type
          const allowedTypes = ANNOTATION_ALLOWED_UNIT_TYPES.get(annBaseName);
          if (
            allowedTypes &&
            !allowedTypes.has(definingUnitType) &&
            symbol.location
          ) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_ILLEGAL_DEFINING_TYPE,
                ann.name,
                definingUnitType,
              ),
              location: symbol.location,
              code: ErrorCodes.MODIFIER_ILLEGAL_DEFINING_TYPE,
            });
          }

          // MODIFIER_ILLEGAL_DEFINING_TYPE_FOR: defining type must have required modifiers
          if (containingType && symbol.location) {
            const requiredMods =
              ANNOTATION_REQUIRED_DEFINING_MODIFIERS.get(annBaseName);
            if (
              requiredMods &&
              !hasRequiredDefiningModifiers(containingType, requiredMods)
            ) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.MODIFIER_ILLEGAL_DEFINING_TYPE_FOR,
                  ann.name,
                ),
                location: symbol.location,
                code: ErrorCodes.MODIFIER_ILLEGAL_DEFINING_TYPE_FOR,
              });
            }
          }

          // MODIFIER_MIN_VERSION: annotation requires minimum API version
          if (
            options.enableVersionSpecificValidation &&
            options.apiVersion !== undefined &&
            symbol.location
          ) {
            const minVersions = ANNOTATION_MIN_VERSIONS.get(annBaseName);
            if (minVersions) {
              const elementKind = getElementKindForSymbol(symbol);
              const versionReq = minVersions.get(elementKind);
              if (versionReq && options.apiVersion < versionReq.minMajor) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.MODIFIER_MIN_VERSION,
                    ann.name,
                    getSymbolKindName(symbol.kind),
                    versionReq.displayVersion,
                  ),
                  location: symbol.location,
                  code: ErrorCodes.MODIFIER_MIN_VERSION,
                });
              }
            }
          }
        }
      }

      // MODIFIER_REQUIRE_AT_LEAST: Test class must have at least one test method
      const classes = allSymbols.filter(
        (s) => s.kind === SymbolKind.Class && s.parentId === null,
      ) as TypeSymbol[];
      const methods = allSymbols.filter((s) => s.kind === SymbolKind.Method);

      for (const classSymbol of classes) {
        const hasIsTestClass =
          classSymbol.modifiers?.isTestMethod === true ||
          classSymbol.annotations?.some(
            (ann) => ann.name.toLowerCase() === 'istest',
          ) ||
          false;

        if (hasIsTestClass) {
          const classMethods = methods.filter((m) => {
            const containing = findContainingClass(m, allSymbols);
            return containing?.id === classSymbol.id;
          });
          const hasTestMethod = classMethods.some(
            (m) =>
              m.modifiers?.isTestMethod === true ||
              m.annotations?.some((ann) => ann.name.toLowerCase() === 'istest'),
          );
          if (!hasTestMethod) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.MODIFIER_REQUIRE_AT_LEAST,
                'Test',
                'classes',
                'test method',
              ),
              location: classSymbol.location,
              code: ErrorCodes.MODIFIER_REQUIRE_AT_LEAST,
            });
          }
        }
      }

      yield* Effect.logDebug(
        `ModifierValidator: checked ${allSymbols.length} symbols, found ${errors.length} modifier violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
