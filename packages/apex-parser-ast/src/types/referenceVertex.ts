/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolLocation } from './symbol';
import { ReferenceContext } from './typeReference';

/**
 * Context for lazy binding of cross-file references
 */
export interface LazyBindingContext {
  sourceFile: string;
  targetFile?: string;
  expectedNamespace?: string;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
  isStatic: boolean;
  resolutionAttempts: number;
  lastAttempt: number;
}

/**
 * Reference vertex that represents a reference occurrence in the code
 * Following the existing graph architecture pattern where vertices represent entities
 * and edges represent relationships between entities
 */
export interface ReferenceVertex {
  /** Unique identifier for this reference vertex */
  id: string;

  // Core reference data (vertex properties)
  /** The referenced name (e.g., "createFile") */
  name: string;
  /** How it's being used */
  context: ReferenceContext;
  /** For "FileUtilities.createFile" - the qualifier */
  qualifier?: string;
  /** Parent method/class context */
  parentContext?: string;

  // Resolution state (vertex properties)
  /** Whether this reference has been resolved to a symbol */
  isResolved: boolean;
  /** ID of the resolved symbol (if isResolved is true) */
  resolvedSymbolId?: string;
  /** Context for lazy binding of cross-file references */
  bindingContext: LazyBindingContext;

  // Cross-file resolution metadata (vertex properties)
  /** Expected target file for cross-file references */
  expectedTargetFile?: string;
  /** Expected namespace for cross-file references */
  expectedNamespace?: string;
  /** Access modifier for cross-file validation */
  accessModifier?: 'public' | 'private' | 'protected' | 'global';

  // Resolution attempts tracking (vertex properties)
  /** Number of resolution attempts made */
  resolutionAttempts: number;
  /** Timestamp of last resolution attempt */
  lastResolutionAttempt: number;
  /** Array of resolution error messages */
  resolutionErrors: string[];

  // Change management support (for future phases)
  /** Version number for detecting stale references */
  changeVersion?: number;
  /** Scope of updates that affect this reference */
  updateScope?: 'line' | 'symbol' | 'file';
}

/**
 * Factory for creating ReferenceVertex instances
 */
export class ReferenceVertexFactory {
  /**
   * Create a ReferenceVertex from a TypeReference
   * @param typeReference The TypeReference to convert
   * @param sourceFile The file containing the reference
   * @returns A new ReferenceVertex instance
   */
  static fromTypeReference(
    typeReference: any,
    sourceFile: string,
  ): ReferenceVertex {
    const id = this.generateReferenceId(typeReference, sourceFile);

    return {
      id,
      name: typeReference.name,
      context: typeReference.context,
      qualifier: typeReference.qualifier,
      parentContext: typeReference.parentContext,
      isResolved: false,
      bindingContext: {
        sourceFile,
        accessModifier: 'public', // Default, will be updated during resolution
        isStatic: false, // Default, will be updated during resolution
        resolutionAttempts: 0,
        lastAttempt: Date.now(),
      },
      resolutionAttempts: 0,
      lastResolutionAttempt: Date.now(),
      resolutionErrors: [],
    };
  }

  /**
   * Create a method call reference vertex
   */
  static createMethodCallReference(
    methodName: string,
    sourceFile: string,
    qualifier?: string,
    parentContext?: string,
  ): ReferenceVertex {
    const id = this.generateReferenceId(
      {
        name: methodName,
        location: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
      sourceFile,
    );

    return {
      id,
      name: methodName,
      context: ReferenceContext.METHOD_CALL,
      qualifier,
      parentContext,
      isResolved: false,
      bindingContext: {
        sourceFile,
        accessModifier: 'public',
        isStatic: false,
        resolutionAttempts: 0,
        lastAttempt: Date.now(),
      },
      resolutionAttempts: 0,
      lastResolutionAttempt: Date.now(),
      resolutionErrors: [],
    };
  }

  /**
   * Create a field access reference vertex
   */
  static createFieldAccessReference(
    fieldName: string,
    sourceFile: string,
    objectName: string,
    parentContext?: string,
  ): ReferenceVertex {
    const id = this.generateReferenceId(
      {
        name: fieldName,
        location: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
      sourceFile,
    );

    return {
      id,
      name: fieldName,
      context: ReferenceContext.FIELD_ACCESS,
      qualifier: objectName,
      parentContext,
      isResolved: false,
      bindingContext: {
        sourceFile,
        accessModifier: 'public',
        isStatic: false,
        resolutionAttempts: 0,
        lastAttempt: Date.now(),
      },
      resolutionAttempts: 0,
      lastResolutionAttempt: Date.now(),
      resolutionErrors: [],
    };
  }

  /**
   * Create a type declaration reference vertex
   */
  static createTypeDeclarationReference(
    typeName: string,
    sourceFile: string,
    parentContext?: string,
  ): ReferenceVertex {
    const id = this.generateReferenceId(
      {
        name: typeName,
        location: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
      sourceFile,
    );

    return {
      id,
      name: typeName,
      context: ReferenceContext.TYPE_DECLARATION,
      parentContext,
      isResolved: false,
      bindingContext: {
        sourceFile,
        accessModifier: 'public',
        isStatic: false,
        resolutionAttempts: 0,
        lastAttempt: Date.now(),
      },
      resolutionAttempts: 0,
      lastResolutionAttempt: Date.now(),
      resolutionErrors: [],
    };
  }

  /**
   * Generate a unique ID for a reference vertex
   */
  private static generateReferenceId(
    reference: { name: string; location: SymbolLocation },
    sourceFile: string,
  ): string {
    const { name, location } = reference;
    const { startLine, startColumn, endLine, endColumn } = location;
    return `${sourceFile}:${startLine}:${startColumn}:${endLine}:${endColumn}:${name}`;
  }
}
