/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  Namespace,
  NamespaceParseResult,
  TypeNameConstructionOptions,
} from '../types/namespaceResolution';

/**
 * Utility class for namespace operations
 * Maps to Java Namespaces utility class
 */
export class NamespaceUtils {
  private static readonly logger = getLogger();
  private static readonly namespaceCache = new Map<string, Namespace>();
  private static readonly TRIGGER_NAMESPACE = 'trigger';

  /**
   * Parse a namespace string into a Namespace object
   * Maps to Java Namespaces.parse()
   */
  static parse(fullNamespace: string): NamespaceParseResult {
    try {
      // Handle null/empty namespace
      if (!fullNamespace || fullNamespace.trim() === '') {
        return {
          namespace: this.createEmptyNamespace(),
          isValid: true,
        };
      }

      // Check cache first
      const cached = this.namespaceCache.get(fullNamespace);
      if (cached) {
        return { namespace: cached, isValid: true };
      }

      // Handle "__" separator for sub-namespaces
      const index = fullNamespace.indexOf('__');
      let namespace: Namespace;

      if (index > -1) {
        const mainNamespace = fullNamespace.substring(0, index);
        const subNamespace = fullNamespace.substring(index + 2);
        namespace = this.createEmptyNamespace();
      } else {
        namespace = this.createEmptyNamespace();
      }

      // Cache the result
      this.namespaceCache.set(fullNamespace, namespace);

      return { namespace, isValid: true };
    } catch (error) {
      this.logger.error(
        () =>
          `Error parsing namespace: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        namespace: this.createEmptyNamespace(),
        isValid: false,
        errorMessage: `Failed to parse namespace: ${fullNamespace}`,
      };
    }
  }

  /**
   * Create a namespace object
   * Maps to Java Namespaces.create()
   */
  static create(name: string, subNamespace?: string): Namespace {
    const bytecodeName = this.toBytecodeName(name);
    const bytecodeNameLower = bytecodeName.toLowerCase();

    return {
      name,
      subNamespace,
      bytecodeName,
      bytecodeNameLower,
      isNull: false,
      isEmpty: !name || name.trim() === '',
    };
  }

  /**
   * Create an empty/null namespace
   * Maps to Java Namespaces.empty()
   */
  static createEmptyNamespace(): Namespace {
    return {
      name: '',
      bytecodeName: '',
      bytecodeNameLower: '',
      isNull: true,
      isEmpty: true,
    };
  }

  /**
   * Check if namespace is null or empty
   * Maps to Java Namespace.isEmptyOrNull()
   */
  static isEmptyOrNull(namespace: Namespace): boolean {
    return namespace.isNull || namespace.isEmpty;
  }

  /**
   * Convert namespace name to bytecode format
   * Maps to Java bytecode name conversion
   */
  static toBytecodeName(name: string): string {
    if (!name) return '';

    // Replace dots with slashes for bytecode format
    return name.replace(/\./g, '/');
  }

  /**
   * Create type name with namespace
   * Maps to Java createTypeWithNamespace()
   */
  static createTypeWithNamespace(
    namespace: Namespace,
    typeName: string,
    options: TypeNameConstructionOptions = this.getDefaultOptions(),
  ): string {
    if (this.isEmptyOrNull(namespace)) {
      return options.normalizeCase ? typeName.toLowerCase() : typeName;
    }

    const namespacePart = options.useBytecodeName
      ? namespace.bytecodeNameLower
      : namespace.name;

    const separator = options.separator || '/';
    const result = `${namespacePart}${separator}${typeName}`;

    return options.normalizeCase ? result.toLowerCase() : result;
  }

  /**
   * Create built-in type candidate name
   * Maps to Java createBuiltInCandidate()
   */
  static createBuiltInCandidate(
    namespace: Namespace,
    name: string,
    options: TypeNameConstructionOptions = this.getDefaultOptions(),
  ): string {
    if (this.isEmptyOrNull(namespace)) {
      return `BUILT_IN${name}`;
    }

    return this.createTypeWithThreeParts(
      'BUILT_IN_NO_SLASH',
      namespace.bytecodeNameLower,
      name,
      options,
    );
  }

  /**
   * Create type name with three parts
   * Maps to Java createTypeWithThreeParts()
   */
  static createTypeWithThreeParts(
    part1: string,
    part2: string,
    part3: string,
    options: TypeNameConstructionOptions = this.getDefaultOptions(),
  ): string {
    const separator = options.separator || '/';
    const result = `${part1}${separator}${part2}${separator}${part3}`;

    return options.normalizeCase ? result.toLowerCase() : result;
  }

  /**
   * Validate trigger namespace usage
   * Maps to Java trigger namespace validation
   */
  static validateTriggerNamespace(nameParts: string[]): boolean {
    if (nameParts.length === 0) return true;

    const firstPart = nameParts[0];
    if (firstPart && firstPart.toLowerCase() === this.TRIGGER_NAMESPACE) {
      this.logger.warn(
        () => 'Trigger namespace cannot be used for type references',
      );
      return false;
    }

    return true;
  }

  /**
   * Adjust empty names in type name parts
   * Maps to Java adjustEmptyNames()
   */
  static adjustEmptyNames(nameParts: string[], version: number): string[] {
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
  }

  /**
   * Get default type name construction options
   */
  private static getDefaultOptions(): TypeNameConstructionOptions {
    return {
      useBytecodeName: true,
      includeNamespace: true,
      normalizeCase: true,
      separator: '/',
    };
  }

  /**
   * Clear the namespace cache
   * Useful for testing or memory management
   */
  static clearCache(): void {
    this.namespaceCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.namespaceCache.size,
      entries: Array.from(this.namespaceCache.keys()),
    };
  }
}
