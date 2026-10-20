/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export const CODE_LENS_SERVER_COMMANDS = {
  executeAnonymous: 'sf.anon.apex.run.delegate',
  debugAnonymous: 'sf.anon.apex.debug.delegate',
  runTestClass: 'sf.apex.test.class.run.delegate',
  debugTestClass: 'sf.apex.debug.class.run.delegate',
  runTestMethod: 'sf.apex.test.method.run.delegate',
  debugTestMethod: 'sf.apex.debug.method.run.delegate',
} as const;
