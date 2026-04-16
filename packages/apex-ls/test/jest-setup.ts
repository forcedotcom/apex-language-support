/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/** Prevents LCSAdapter worker-topology init failures from terminating the Jest process. */
process.env.APEX_LS_DISABLE_WORKER_TOPOLOGY_EXIT = '1';
