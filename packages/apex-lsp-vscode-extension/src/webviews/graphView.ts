/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { getGraphWebviewContent as getTemplate } from './graphTemplate';

export function getGraphWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  graphData: any,
): string {
  return getTemplate(webview, extensionUri, graphData);
}

