/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ReferenceContext } from './typeReference';
import { SymbolLocation } from './symbol';

/**
 * Hierarchical reference that maintains order, ownership, and structure
 * Each reference owns its children in a deterministic tuple structure
 */
export interface HierarchicalReference {
  name: string; // Full qualified name (e.g., "System.EncodingUtil.urlEncode")
  fullPath: string[]; // Array of path parts ["System", "EncodingUtil", "urlEncode"]
  location: SymbolLocation; // Location of the full reference
  context: ReferenceContext; // Context type
  children: HierarchicalReference[]; // Nested child references

  // Additional context for symbol resolution
  qualifierName?: string; // Name of the qualifier (e.g., "System.EncodingUtil")
  memberName?: string; // Name of the member (e.g., "urlEncode")
  qualifierLocation?: SymbolLocation; // Location of the qualifier
  memberLocation?: SymbolLocation; // Location of the member
}

/**
 * Simple resolver that builds hierarchical references using dynamic programming
 */
export class HierarchicalReferenceResolver {
  private referenceCache = new Map<string, HierarchicalReference>();

  /**
   * Resolve a qualified reference like "a.b.c" into a hierarchical structure
   */
  resolveQualifiedReference(
    qualifiedName: string,
    location: SymbolLocation,
    context: ReferenceContext = ReferenceContext.METHOD_CALL,
  ): HierarchicalReference {
    // Check cache first
    if (this.referenceCache.has(qualifiedName)) {
      return this.referenceCache.get(qualifiedName)!;
    }

    const parts = qualifiedName.split('.');
    const result = this.buildHierarchy(parts, location, context);

    // Cache the result
    this.referenceCache.set(qualifiedName, result);
    return result;
  }

  /**
   * Build the hierarchical structure recursively
   */
  private buildHierarchy(
    parts: string[],
    location: SymbolLocation,
    context: ReferenceContext,
  ): HierarchicalReference {
    if (parts.length === 1) {
      // Base case: single identifier
      return {
        name: parts[0],
        fullPath: [parts[0]],
        location,
        context,
        children: [],
      };
    }

    // Build hierarchy from left to right
    // For 'a.b.c', we want: a.b.c -> b.c -> c
    const currentName = parts.join('.');
    const currentPath = [...parts];

    // The child is the next level down (remove the leftmost part)
    const childParts = parts.slice(1);

    // Build the child hierarchy recursively
    const childLocation = this.adjustLocationForChild(
      location,
      childParts.join('.'),
    );
    const child = this.buildHierarchy(childParts, childLocation, context);

    return {
      name: currentName,
      fullPath: currentPath,
      location,
      context,
      children: [child],
    };
  }

  /**
   * Adjust location for child references (simplified for POC)
   */
  private adjustLocationForChild(
    parentLocation: SymbolLocation,
    childName: string,
  ): SymbolLocation {
    // For POC, just return the parent location
    // In full implementation, this would calculate precise child locations
    return parentLocation;
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.referenceCache.clear();
  }
}
