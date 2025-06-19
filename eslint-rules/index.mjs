/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import turboScriptCheck from './turbo-script-check.mjs';
import turboCircularDependency from './turbo-circular-dependency.mjs';
import turboUnfilteredUsage from './turbo-unfiltered-usage.mjs';

export default {
  rules: {
    'turbo-script-check': turboScriptCheck,
    'turbo-circular-dependency': turboCircularDependency,
    'turbo-unfiltered-usage': turboUnfilteredUsage,
  },
};
