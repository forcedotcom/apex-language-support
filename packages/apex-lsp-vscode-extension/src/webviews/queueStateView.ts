/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

/**
 * HTML template for the Queue State Dashboard webview
 */

export function getQueueStateWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  queueStateData: any,
): string {
  const nonce = getNonce();
  const encodedData = JSON.stringify(queueStateData);

  // Use proper webview URI construction - script is in dist/webview/
  const scriptPath = vscode.Uri.joinPath(
    extensionUri,
    'dist',
    'webview',
    'queueStateScript.js',
  );
  const scriptUri = webview.asWebviewUri(scriptPath);

  return /* html */ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy"
              content="default-src 'none'; img-src ${webview.cspSource} https:;
                       script-src 'nonce-${nonce}' ${webview.cspSource};
                       style-src 'unsafe-inline' ${webview.cspSource};" />
        <style>
          html, body { 
            height: 100%; 
            width: 100%; 
            margin: 0; 
            padding: 0; 
            overflow: hidden;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
          }
          
          .dashboard-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
          }
          
          .dashboard-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-titleBar-activeBackground);
          }
          
          .dashboard-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-titleBar-activeForeground);
          }
          
          .dashboard-controls {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          .control-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 3px;
            padding: 4px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .control-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .control-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .control-btn.secondary {
            background: transparent;
            border-color: var(--vscode-button-border);
          }
          
          .dashboard-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }
          
          .metrics-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          
          .metric-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 16px;
            display: flex;
            flex-direction: column;
          }
          
          .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .metric-value {
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
          }
          
          .metric-subvalue {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
          }
          
          .priority-section {
            margin-bottom: 16px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background: var(--vscode-editor-background);
          }
          
          .priority-header {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            background: var(--vscode-list-hoverBackground);
          }
          
          .priority-header:hover {
            background: var(--vscode-list-activeSelectionBackground);
          }
          
          .priority-name {
            font-weight: 600;
            font-size: 14px;
          }
          
          .priority-stats {
            display: flex;
            gap: 16px;
            font-size: 12px;
          }
          
          .priority-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .priority-stat-label {
            color: var(--vscode-descriptionForeground);
            font-size: 10px;
            text-transform: uppercase;
          }
          
          .priority-stat-value {
            font-weight: 600;
            margin-top: 2px;
          }
          
          .priority-content {
            padding: 16px;
            display: none;
          }
          
          .priority-content.expanded {
            display: block;
          }
          
          .utilization-bar {
            width: 100%;
            height: 8px;
            background: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
            margin: 8px 0;
          }
          
          .utilization-fill {
            height: 100%;
            transition: width 0.3s ease, background-color 0.3s ease;
            border-radius: 4px;
          }
          
          .utilization-low {
            background: #4CAF50;
          }
          
          .utilization-medium {
            background: #FF9800;
          }
          
          .utilization-high {
            background: #F44336;
          }
          
          .request-type-section {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-panel-border);
          }
          
          .request-type-title {
            font-weight: 600;
            font-size: 12px;
            margin-bottom: 8px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
          }
          
          .request-type-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
          }
          
          .request-type-item {
            display: flex;
            justify-content: space-between;
            padding: 6px 8px;
            background: var(--vscode-list-hoverBackground);
            border-radius: 3px;
            font-size: 11px;
          }
          
          .request-type-name {
            color: var(--vscode-editor-foreground);
          }
          
          .request-type-count {
            font-weight: 600;
            color: var(--vscode-editor-foreground);
          }
          
          .footer {
            padding: 8px 16px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-titleBar-activeBackground);
          }
          
          .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
          }
          
          .status-active {
            background: #4CAF50;
            animation: pulse 2s infinite;
          }
          
          .status-paused {
            background: #FF9800;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          .empty-state {
            text-align: center;
            padding: 48px 16px;
            color: var(--vscode-descriptionForeground);
          }
          
          .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="dashboard-container">
          <div class="dashboard-header">
            <div class="dashboard-title">Queue State Dashboard</div>
            <div class="dashboard-controls">
              <button id="refresh-btn" class="control-btn">Refresh</button>
            </div>
          </div>
          <div class="dashboard-content" id="dashboard-content">
            <!-- Content will be rendered by JavaScript -->
          </div>
          <div class="footer">
            <div>
              <span class="status-indicator status-active" id="status-indicator"></span>
              <span id="status-text">Manual refresh only</span>
            </div>
            <div id="last-update">Last updated: --</div>
          </div>
        </div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const initialData = ${encodedData};
          // Make vscode and initialData available globally for the external script
          window.vscode = vscode;
          window.initialData = initialData;
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>
  `;
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
