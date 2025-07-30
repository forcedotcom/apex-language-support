/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  NamespaceParseResult,
  TypeNameConstructionOptions,
} from './namespaceResolution';
import { Namespace, Namespaces } from './namespaces';

// Module-level constants (previously private static fields)
const logger = getLogger();
const TRIGGER_NAMESPACE = 'trigger';

/**
 * Get default type name construction options
 */
const getDefaultOptions = (): TypeNameConstructionOptions => ({
  useBytecodeName: true,
  includeNamespace: true,
  normalizeCase: true,
  separator: '/',
});

/**
 * Create an empty/null namespace
 * Maps to Java Namespaces.empty()
 */
const createEmptyNamespace = (): Namespace => {
  return Namespaces.EMPTY;
};

/**
 * Check if namespace is null or empty
 * Maps to Java Namespace.isEmptyOrNull()
 */
const isEmptyOrNull = (namespace: Namespace): boolean =>
  Namespace.isEmptyOrNull(namespace);

/**
 * Create type name with namespace
 * Maps to Java createTypeWithNamespace()
 */
export const createTypeWithNamespace = (
  namespace: Namespace,
  typeName: string,
  options: TypeNameConstructionOptions = getDefaultOptions(),
): string => {
  if (isEmptyOrNull(namespace)) {
    return options.normalizeCase ? typeName.toLowerCase() : typeName;
  }

  const namespacePart = options.useBytecodeName
    ? namespace.getBytecodeNameLower()
    : namespace.toString();

  const separator = options.separator || '/';
  const result = `${namespacePart}${separator}${typeName}`;

  return options.normalizeCase ? result.toLowerCase() : result;
};

/**
 * Validate trigger namespace usage
 * Maps to Java trigger namespace validation
 */
export const validateTriggerNamespace = (nameParts: string[]): boolean => {
  if (nameParts.length === 0) return true;

  const firstPart = nameParts[0];
  if (firstPart && firstPart.toLowerCase() === TRIGGER_NAMESPACE) {
    logger.warn(() => 'Trigger namespace cannot be used for type references');
    return false;
  }

  return true;
};

/**
 * Adjust empty names in type name parts
 * Maps to Java adjustEmptyNames()
 */
export const adjustEmptyNames = (
  nameParts: string[],
  version: number,
): string[] => {
  const adjusted: string[] = [];

  for (let i = 0; i < nameParts.length; i++) {
    const part = nameParts[i];

    // Handle double dots (..) which create empty parts
    if (part === '' || part === null || part === undefined) {
      // For older versions, empty parts might be allowed
      if (version < 50) {
        adjusted.push(''); // Keep empty part for older versions
      }
      // For newer versions, skip empty parts
    } else {
      adjusted.push(part);
    }
  }

  return adjusted;
};
