/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export const hash = (...objs: any): number => {
  let hashValue = 0x811c9dc5;

  for (const obj of objs) {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);

    for (let index = 0; index < str.length; index++) {
      hashValue ^= str.charCodeAt(index);
      hashValue = Math.imul(hashValue, 0x01000193);
    }

    // Separate adjacent values so ["ab", "c"] and ["a", "bc"] hash differently.
    hashValue ^= 0;
    hashValue = Math.imul(hashValue, 0x01000193);
  }

  return hashValue >>> 0;
};
