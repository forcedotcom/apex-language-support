/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

module.exports = {
  rules: {
    'turbo-script-check': require('./turbo-script-check'),
    'turbo-circular-dependency': require('./turbo-circular-dependency'),
    'turbo-unfiltered-usage': require('./turbo-unfiltered-usage'),
  },
};
