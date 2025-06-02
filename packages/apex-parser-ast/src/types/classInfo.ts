/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypeInfo } from './typeInfo';

/**
 * Represents information about an Apex class
 */
export interface ApexClassInfo {
  /**
   * The fully qualified name of the class
   */
  name: string;

  /**
   * The type information for the class
   */
  typeInfo: TypeInfo;

  /**
   * The source code of the class
   */
  source?: string;

  /**
   * The file path where the class is defined
   */
  filePath?: string;
}
