/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ModifierOrAnnotationTypeInfo } from './modifiers';
import { TypeInfo } from './typeInfo';

/**
 * Something that has a location.
 */
export interface Locatable {
  /**
   * Gets the location.
   * @returns The location, or a default 'NONE' location.
   */
  getLoc(): Location;
}

/**
 * A Location is Locatable because it can return itself.
 * A point in the code base, where we use a special indicator, negative values, for synthetic locations.
 */
export interface Location extends Locatable {
  /**
   * 0 based index of the first character
   */
  getStartIndex(): number;

  /**
   * 0 based index that points 1 past the last character
   */
  getEndIndex(): number;

  /**
   * 1 based line number
   */
  getLine(): number;

  /**
   * 1 based column number
   */
  getColumn(): number;
}

// You might want to define a Locations object with a NONE property
const Locations = {
  NONE: {} as Location, // Replace {} with the actual representation of NONE
};

// Default implementation
export const defaultLocatable: Locatable = {
  getLoc(): Location {
    return Locations.NONE;
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Wrapper<T> {
  // Assuming Wrapper is a generic interface used for type wrapping
}

export interface Supplier<T> {
  get(): T;
}

export interface Interner<T> {
  intern(value: T): T;
}

// Additional interfaces that might be needed:

export interface StandardAnnotationTypeInfo
  extends ModifierOrAnnotationTypeInfo {
  // Add specific properties and methods if needed
}

export interface ModifierTypeInfo extends ModifierOrAnnotationTypeInfo {
  // Add specific properties and methods if needed
}

export interface TypeInfoEquivalence {
  unwrapAll(
    wrappers: Iterable<Wrapper<TypeInfo>>,
  ): ModifierOrAnnotationTypeInfo[];
}
