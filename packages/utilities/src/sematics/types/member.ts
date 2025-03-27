/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Locatable } from './other';
import { ModifierGroup } from './modifiers';
import { TypeInfo } from './typeInfo';

export interface Member extends Locatable {
  /**
   * The developer name for the variable. Specifically this preserves casing.
   */
  getName(): string;

  /**
   * The defining type for this variable.
   */
  getDefiningType(): TypeInfo;

  getMemberType(): Member.Type;

  /**
   * The modifiers for the member.
   */
  getModifiers(): ModifierGroup;
}

export namespace Member {
  export enum Type {
    FIELD = 'Field',
    METHOD = 'Method',
    PROPERTY = 'Property',
    LOCAL = 'Local',
    NONE = 'None',
    DYNAMIC = 'Dynamic',
  }
}
