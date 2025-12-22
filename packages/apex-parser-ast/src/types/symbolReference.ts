/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolLocation } from './symbol';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Represents the context in which a symbol reference is used
 */
export enum ReferenceContext {
  METHOD_CALL = 0,
  CLASS_REFERENCE = 1, // For class names in dotted expressions
  TYPE_DECLARATION = 2,
  FIELD_ACCESS = 3,
  CONSTRUCTOR_CALL = 4,
  VARIABLE_USAGE = 5,
  PARAMETER_TYPE = 6,
  VARIABLE_DECLARATION = 7,
  GENERIC_PARAMETER_TYPE = 8,
  CAST_TYPE_REFERENCE = 9,
  INSTANCEOF_TYPE_REFERENCE = 10,
  CHAINED_TYPE = 11, // Root reference for entire chained type
  CHAIN_STEP = 12, // Ambiguous node that could be multiple reference types
  NAMESPACE = 13, // Explicitly resolved namespace
  RETURN_TYPE = 14, // For return type references in method declarations
  PROPERTY_REFERENCE = 15, // For property names in property declarations
}

/**
 * Enhanced SymbolReference interface
 * Tracks all code references (methods, fields, types, variables, etc.) hierarchically.
 * 
 * SymbolReference is used throughout the parser to track references to:
 * - Method calls (METHOD_CALL)
 * - Field access (FIELD_ACCESS)
 * - Variable usage (VARIABLE_USAGE)
 * - Type declarations (TYPE_DECLARATION)
 * - Constructor calls (CONSTRUCTOR_CALL)
 * - And other code references
 * 
 * The parser uses a hierarchical approach with separate stacks:
 * - scopeStack: Tracks lexical scopes (class, method, block) for symbol resolution
 * - methodCallStack: Tracks method/constructor call hierarchy for parameter tracking
 * These stacks operate independently and track different concerns.
 */
export interface SymbolReference {
  /** The referenced name (e.g., "createFile") */
  name: string;
  /** Exact position in source */
  location: SymbolLocation;
  /** How it's being used */
  context: ReferenceContext;
  /** Parent method/class context */
  parentContext?: string;
  /** ID of the resolved symbol (if resolved, undefined otherwise) */
  resolvedSymbolId?: string;
  /** Optional access semantics for reads/writes (assignments) */
  access?: 'read' | 'write' | 'readwrite';
  /** Optional: indicates static access when known from parsing */
  isStatic?: boolean;
}

/**
 * A symbol reference that represents a chained expression
 * The root reference spans the entire chain and contains all nodes
 */
export interface ChainedSymbolReference extends SymbolReference {
  /** All nodes in the chain, including the base expression and all steps */
  readonly chainNodes: SymbolReference[];
}

/**
 * Enhanced SymbolReference implementation with computed properties
 */
export class EnhancedSymbolReference implements SymbolReference {
  private _logger = getLogger();

  constructor(
    public name: string,
    public location: SymbolLocation,
    public context: ReferenceContext,
    public resolvedSymbolId?: string,
    public parentContext?: string,
    public access?: 'read' | 'write' | 'readwrite',
    public isStatic?: boolean,
  ) {}

  // Custom JSON serialization to avoid circular references
  toJSON(): any {
    const base: any = {
      name: this.name,
      location: this.location,
      context: this.context,
      resolvedSymbolId: this.resolvedSymbolId,
      parentContext: this.parentContext,
      access: this.access,
      isStatic: this.isStatic,
    };

    // Add chained expression info without circular references
    const chainNodes = (this as any).chainNodes;
    if (chainNodes) {
      base.chainNodes = chainNodes; // Preserve the actual chainNodes array
      base.referenceChainSize = chainNodes.length;
      base.referenceChainNames = chainNodes.map(
        (node: SymbolReference) => node.name,
      );
    }

    return base;
  }
}

/**
 * Factory for creating SymbolReference instances
 */
export class SymbolReferenceFactory {
  // Cache for parsed type names to avoid repeated string splitting
  private static typeNameCache = new Map<string, string[]>();

  // Cache for chained symbol references to avoid repeated creation
  private static chainedSymbolCache = new Map<string, ChainedSymbolReference>();

  /**
   * Parse a type name into parts with caching
   * @param typeName The type name to parse
   * @returns Array of type name parts
   */
  private static parseTypeName(typeName: string): string[] {
    if (this.typeNameCache.has(typeName)) {
      return this.typeNameCache.get(typeName)!;
    }

    const parts = typeName.split('.');
    this.typeNameCache.set(typeName, parts);
    return parts;
  }

  /**
   * Clear all caches (useful for testing or memory management)
   */
  static clearCaches(): void {
    this.typeNameCache.clear();
    this.chainedSymbolCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): {
    typeNameCacheSize: number;
    chainedSymbolCacheSize: number;
  } {
    return {
      typeNameCacheSize: this.typeNameCache.size,
      chainedSymbolCacheSize: this.chainedSymbolCache.size,
    };
  }

  /**
   * Create a method call reference
   */
  static createMethodCallReference(
    methodName: string,
    location: SymbolLocation,
    parentContext?: string,
    isStatic?: boolean,
  ): SymbolReference {
    const reference = new EnhancedSymbolReference(
      methodName,
      location,
      ReferenceContext.METHOD_CALL,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      undefined,
      isStatic,
    );

    // Note: For simple qualified references, we don't need complex chain structures
    // The qualifier information is stored in the reference itself

    return reference;
  }

  /**
   * Create a hierarchical method call reference with full structure
   */
  static createHierarchicalMethodCallReference(
    qualifierName: string,
    methodName: string,
    methodLocation: SymbolLocation,
    parentContext?: string,
    isStatic?: boolean,
  ): SymbolReference {
    const methodRef = new EnhancedSymbolReference(
      methodName,
      methodLocation,
      ReferenceContext.METHOD_CALL,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      undefined,
      isStatic,
    );

    return methodRef;
  }

  /**
   * Create a type declaration reference
   */
  static createTypeDeclarationReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
    preciseLocations?: SymbolLocation[],
  ): SymbolReference {
    // Check if this is a dotted type name that needs chain resolution
    if (typeName.includes('.')) {
      // For dotted type names, create individual chain nodes
      const parts = this.parseTypeName(typeName);
      const chainNodes: SymbolReference[] = [];

      // Create chain nodes for each part
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        // Use precise location if available, otherwise fall back to the base location
        const partLocation =
          preciseLocations && preciseLocations[i]
            ? preciseLocations[i]
            : location;

        const nodeRef = new EnhancedSymbolReference(
          part,
          partLocation,
          isLast
            ? ReferenceContext.CLASS_REFERENCE
            : ReferenceContext.NAMESPACE,
          undefined, // resolvedSymbolId - will be set during second-pass resolution
          parentContext,
        );

        chainNodes.push(nodeRef);
      }

      // Create a chained symbol reference
      return this.createChainedTypeReference(
        chainNodes,
        typeName,
        location,
        parentContext,
      );
    }

    // For simple type names, create a regular type declaration reference
    return new EnhancedSymbolReference(
      typeName,
      location,
      ReferenceContext.TYPE_DECLARATION,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a field access reference
   */
  static createFieldAccessReference(
    fieldName: string,
    location: SymbolLocation,
    objectName: string,
    parentContext?: string,
    access?: 'read' | 'write' | 'readwrite',
  ): SymbolReference {
    const fieldRef = new EnhancedSymbolReference(
      fieldName,
      location,
      ReferenceContext.FIELD_ACCESS,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      access,
      undefined,
    );

    // Note: For simple field access, we don't need complex chain structures
    // The qualifier information is stored in the reference itself

    return fieldRef;
  }

  /**
   * Create a hierarchical field access reference with full structure
   */
  static createHierarchicalFieldAccessReference(
    qualifierName: string,
    fieldName: string,
    fieldLocation: SymbolLocation,
    parentContext?: string,
    access?: 'read' | 'write' | 'readwrite',
  ): SymbolReference {
    const fieldRef = new EnhancedSymbolReference(
      fieldName,
      fieldLocation,
      ReferenceContext.FIELD_ACCESS,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      access,
      undefined,
    );

    // Note: For simple hierarchical field access, we don't need complex chain structures
    // The qualifier information is stored in the reference itself

    return fieldRef;
  }

  /**
   * Create a constructor call reference
   */
  static createConstructorCallReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): SymbolReference {
    return new EnhancedSymbolReference(
      typeName,
      location,
      ReferenceContext.CONSTRUCTOR_CALL,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a class reference
   */
  static createClassReference(
    className: string,
    location: SymbolLocation,
    parentContext?: string,
  ): SymbolReference {
    return new EnhancedSymbolReference(
      className,
      location,
      ReferenceContext.CLASS_REFERENCE,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a variable usage reference
   */
  static createVariableUsageReference(
    variableName: string,
    location: SymbolLocation,
    parentContext?: string,
    access?: 'read' | 'write' | 'readwrite',
  ): SymbolReference {
    return new EnhancedSymbolReference(
      variableName,
      location,
      ReferenceContext.VARIABLE_USAGE,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      access,
    );
  }

  /**
   * Create a variable declaration reference
   */
  static createVariableDeclarationReference(
    variableName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): SymbolReference {
    return new EnhancedSymbolReference(
      variableName,
      location,
      ReferenceContext.VARIABLE_DECLARATION,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a parameter type reference
   */
  static createParameterTypeReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
    preciseLocations?: SymbolLocation[],
  ): SymbolReference {
    // Check if this is a dotted type name that needs chain resolution
    if (typeName.includes('.')) {
      // For dotted type names, create individual chain nodes
      const parts = this.parseTypeName(typeName);
      const chainNodes: SymbolReference[] = [];

      // Create chain nodes for each part
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        // Use precise location if available, otherwise fall back to the base location
        const partLocation =
          preciseLocations && preciseLocations[i]
            ? preciseLocations[i]
            : location;

        const nodeRef = new EnhancedSymbolReference(
          part,
          partLocation,
          isLast
            ? ReferenceContext.CLASS_REFERENCE
            : ReferenceContext.CLASS_REFERENCE,
          undefined, // resolvedSymbolId - will be set during second-pass resolution
          parentContext,
        );

        chainNodes.push(nodeRef);
      }

      // Create a chained symbol reference
      return this.createChainedTypeReference(
        chainNodes,
        typeName,
        location,
        parentContext,
      );
    }

    // For simple type names, create a simple PARAMETER_TYPE reference
    return new EnhancedSymbolReference(
      typeName,
      location,
      ReferenceContext.PARAMETER_TYPE,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a generic parameter type reference
   */
  static createGenericParameterTypeReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): SymbolReference {
    return new EnhancedSymbolReference(
      typeName,
      location,
      ReferenceContext.GENERIC_PARAMETER_TYPE,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a cast type reference
   */
  static createCastTypeReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): SymbolReference {
    return new EnhancedSymbolReference(
      typeName,
      location,
      ReferenceContext.CAST_TYPE_REFERENCE,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create an instanceof type reference
   */
  static createInstanceOfTypeReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): SymbolReference {
    return new EnhancedSymbolReference(
      typeName,
      location,
      ReferenceContext.INSTANCEOF_TYPE_REFERENCE,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a complex hierarchical reference from multiple parts
   * e.g., "System.EncodingUtil.urlEncode" -> chain of [System, EncodingUtil, urlEncode]
   */
  static createComplexHierarchicalReference(
    parts: string[],
    locations: SymbolLocation[],
    context: ReferenceContext,
    parentContext?: string,
    isStatic?: boolean,
    access?: 'read' | 'write' | 'readwrite',
  ): SymbolReference {
    if (parts.length === 0) {
      throw new Error('Cannot create hierarchical reference with empty parts');
    }

    if (parts.length === 1) {
      // Single part - no hierarchy needed
      return new EnhancedSymbolReference(
        parts[0],
        locations[0],
        context,
        undefined, // resolvedSymbolId - will be set during second-pass resolution
        parentContext,
        access,
        isStatic,
      );
    }

    // Create the main reference (the last part)
    const mainRef = new EnhancedSymbolReference(
      parts[parts.length - 1],
      locations[locations.length - 1],
      context,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      access,
      isStatic,
    );

    return mainRef;
  }

  /**
   * Create a root SymbolRef for the entire chained expression
   * This SymbolRef represents the complete chain with all nodes stored in an array
   * The root reference spans the entire chain from start to end
   */
  static createChainedExpressionReference(
    chainNodes: SymbolReference[],
    chainedExpression: SymbolReference,
    parentContext?: string,
  ): ChainedSymbolReference {
    // Compute combined location from chain nodes
    const baseLocation = chainNodes[0]?.location;
    const finalLocation = chainNodes[chainNodes.length - 1]?.location;

    if (!baseLocation || !finalLocation) {
      throw new Error('Chain nodes must have valid locations');
    }

    // Create the root reference with the full chain span
    // For chained expressions, the identifierRange should match the symbolRange
    const rootRef = new EnhancedSymbolReference(
      chainedExpression.name, // Name contains the full expression
      {
        symbolRange: {
          startLine: baseLocation.symbolRange.startLine,
          startColumn: baseLocation.symbolRange.startColumn,
          endLine: finalLocation.symbolRange.endLine,
          endColumn: finalLocation.symbolRange.endColumn,
        },
        identifierRange: {
          startLine: baseLocation.symbolRange.startLine,
          startColumn: baseLocation.symbolRange.startColumn,
          endLine: finalLocation.symbolRange.endLine,
          endColumn: finalLocation.symbolRange.endColumn,
        },
      },
      ReferenceContext.CHAINED_TYPE, // New context for chained expressions
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      undefined,
      false, // Not static by default
    );

    // Add chained expression properties
    (rootRef as any).chainNodes = chainNodes;

    return rootRef as unknown as ChainedSymbolReference;
  }

  /**
   * Create a chained type reference for dotted type names
   * This method handles dotted type references like "System.Url" in type declarations,
   * creating a chained symbol reference that can be resolved using the same
   * chain resolution logic as expressions
   */
  static createChainedTypeReference(
    chainNodes: SymbolReference[],
    fullTypeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): ChainedSymbolReference {
    // Compute combined location from chain nodes or use provided location
    const baseLocation = chainNodes[0]?.location || location;
    const finalLocation =
      chainNodes[chainNodes.length - 1]?.location || location;

    if (!baseLocation || !finalLocation) {
      throw new Error('Chain nodes must have valid locations');
    }

    // Create the root reference with the full chain span
    const rootRef = new EnhancedSymbolReference(
      fullTypeName, // Name contains the full type name (e.g., "System.Url")
      {
        symbolRange: {
          startLine: baseLocation.symbolRange.startLine,
          startColumn: baseLocation.symbolRange.startColumn,
          endLine: finalLocation.symbolRange.endLine,
          endColumn: finalLocation.symbolRange.endColumn,
        },
        identifierRange: {
          startLine: baseLocation.identifierRange.startLine,
          startColumn: baseLocation.identifierRange.startColumn,
          endLine: finalLocation.identifierRange.endLine,
          endColumn: finalLocation.identifierRange.endColumn,
        },
      },
      ReferenceContext.CHAINED_TYPE, // Use chained expression context for type chains
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
      undefined,
      false, // Not static by default
    );

    // Add chained expression properties
    (rootRef as any).chainNodes = chainNodes;

    return rootRef as unknown as ChainedSymbolReference;
  }

  /**
   * Create a return type reference for method declarations
   * This handles return types like "System.Url" in method signatures
   */
  static createReturnTypeReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
    preciseLocations?: SymbolLocation[],
  ): SymbolReference {
    // Check if this is a dotted type name that needs chain resolution
    if (typeName.includes('.')) {
      // For dotted type names, create individual chain nodes
      const parts = this.parseTypeName(typeName);
      const chainNodes: SymbolReference[] = [];

      // Create chain nodes for each part
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        // Use precise location if available, otherwise fall back to the base location
        const partLocation =
          preciseLocations && preciseLocations[i]
            ? preciseLocations[i]
            : location;

        const nodeRef = new EnhancedSymbolReference(
          part,
          partLocation,
          isLast
            ? ReferenceContext.CLASS_REFERENCE
            : ReferenceContext.NAMESPACE,
          undefined, // resolvedSymbolId - will be set during second-pass resolution
          parentContext,
        );

        chainNodes.push(nodeRef);
      }

      // Create a chained symbol reference
      return this.createChainedTypeReference(
        chainNodes,
        typeName,
        location,
        parentContext,
      );
    }

    // For simple type names, create a regular return type reference
    return new EnhancedSymbolReference(
      typeName,
      location,
      ReferenceContext.RETURN_TYPE,
      undefined, // resolvedSymbolId - will be set during second-pass resolution
      parentContext,
    );
  }

  /**
   * Create a property reference for property names in property declarations
   */
  static createPropertyReference(
    propertyName: string,
    location: SymbolLocation,
  ): SymbolReference {
    return {
      name: propertyName,
      context: ReferenceContext.PROPERTY_REFERENCE,
      location,
      resolvedSymbolId: undefined, // Will be set during second-pass resolution
    };
  }
}


