/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('APEX_RESOLUTION_GROUP', 'qualified');
});

import './ApexSymbolManager.resolution.test?group=qualified';

afterAll(() => {
  vi.unstubAllEnvs();
});
