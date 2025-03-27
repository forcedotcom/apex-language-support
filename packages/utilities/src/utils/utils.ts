/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import crypto from 'crypto';

export const hash = (...objs: any): number => {
  const hash = crypto.createHash('sha256');
  objs.forEach((obj: any) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    hash.update(str);
  });
  const hexHash = hash.digest('hex');
  return parseInt(hexHash.slice(0, 15), 16); // Convert a portion of the hash to a number
};
