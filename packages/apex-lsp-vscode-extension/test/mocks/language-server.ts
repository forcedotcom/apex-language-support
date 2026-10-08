/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
// Mock implementations for the language server functions
export const createAndStartClient = vi.fn().mockResolvedValue(undefined);
export const startLanguageServer = vi.fn().mockResolvedValue(undefined);
export const restartLanguageServer = vi.fn().mockResolvedValue(undefined);
export const stopLanguageServer = vi.fn().mockResolvedValue(undefined);
export const getClient = vi.fn().mockReturnValue(undefined);
