/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file previously contained createClient() which was used to create
// SDK-backed client instances. After refactoring cli.ts to inline both the
// demo and real-server creation paths, createClient() is no longer called
// anywhere and has been removed. The file is kept as a placeholder in case
// future factory utilities are needed.
