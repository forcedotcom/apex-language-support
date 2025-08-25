/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Mock implementations for the language server functions
export const createAndStartClient = jest.fn().mockResolvedValue(undefined);
export const startLanguageServer = jest.fn().mockResolvedValue(undefined);
export const restartLanguageServer = jest.fn().mockResolvedValue(undefined);
export const stopLanguageServer = jest.fn().mockResolvedValue(undefined);
export const getClient = jest.fn().mockReturnValue(undefined);
