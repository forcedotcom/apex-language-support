/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Locatable } from './other';
import { TypeInfo } from './typeInfo';

/**
 * Represents a node in our AST that can be traversed.
 *
 */
export interface AstNode extends Locatable {
  traverse<T extends Scope>(visitor: AstVisitor<T>, scope: T): void;
  validate(symbols: SymbolResolver, scope: ValidationScope): void;
  //   emit(emitter: Emitter): void;

  /**
   * This is the defining type of this AstNode
   */
  getDefiningType(): TypeInfo;
}
