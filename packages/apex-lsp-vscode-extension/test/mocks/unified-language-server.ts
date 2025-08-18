/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

// Mock implementations for the unified language server functions
export const createAndStartUnifiedClient = jest.fn().mockResolvedValue(undefined);
export const startUnifiedLanguageServer = jest.fn().mockResolvedValue(undefined);
export const restartUnifiedLanguageServer = jest.fn().mockResolvedValue(undefined);
export const stopUnifiedLanguageServer = jest.fn().mockResolvedValue(undefined);
export const getUnifiedClient = jest.fn().mockReturnValue(undefined);