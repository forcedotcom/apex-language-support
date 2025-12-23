/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import type { ApexLanguageServerSettings } from '@salesforce/apex-lsp-shared';

/**
 * HTML template for the Performance Settings webview
 */
export function getPerformanceSettingsWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  settings: ApexLanguageServerSettings,
): string {
  const nonce = getNonce();
  const encodedSettings = JSON.stringify(settings);

  // Use proper webview URI construction - script is in dist/webview/
  const scriptPath = vscode.Uri.joinPath(
    extensionUri,
    'dist',
    'webview',
    'performanceSettingsScript.bundle.js',
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
          
          .settings-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
          }
          
          .settings-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-titleBar-activeBackground);
          }
          
          .settings-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-titleBar-activeForeground);
          }
          
          .settings-controls {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 3px;
            padding: 6px 14px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .btn-secondary {
            background: transparent;
            border-color: var(--vscode-button-border);
          }
          
          .settings-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }
          
          .settings-section {
            margin-bottom: 24px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background: var(--vscode-editor-background);
          }
          
          .section-header {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            background: var(--vscode-list-hoverBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .section-header:hover {
            background: var(--vscode-list-activeSelectionBackground);
          }
          
          .section-title {
            font-weight: 600;
            font-size: 14px;
          }
          
          .section-toggle {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          
          .section-content {
            padding: 16px;
            display: none;
          }
          
          .section-content.expanded {
            display: block;
          }
          
          .setting-group {
            margin-bottom: 16px;
          }
          
          .setting-group-title {
            font-weight: 600;
            font-size: 12px;
            margin-bottom: 8px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .setting-item {
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .setting-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--vscode-editor-foreground);
          }
          
          .setting-label-text {
            flex: 1;
          }
          
          .setting-help {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
          }
          
          .setting-input {
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            padding: 4px 8px;
            font-size: 12px;
            font-family: var(--vscode-font-family);
            width: 100%;
            max-width: 200px;
          }
          
          .setting-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
          }
          
          .setting-input:invalid {
            border-color: var(--vscode-errorForeground);
          }
          
          .priority-group {
            margin-bottom: 16px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background: var(--vscode-list-hoverBackground);
          }
          
          .priority-header {
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 12px;
          }
          
          .priority-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .priority-badge.critical {
            background: #F44336;
            color: white;
          }
          
          .priority-badge.immediate {
            background: #FF9800;
            color: white;
          }
          
          .priority-badge.high {
            background: #2196F3;
            color: white;
          }
          
          .priority-badge.normal {
            background: #4CAF50;
            color: white;
          }
          
          .priority-badge.low {
            background: #9E9E9E;
            color: white;
          }
          
          .priority-badge.background {
            background: #607D8B;
            color: white;
          }
          
          .priority-content {
            padding: 12px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
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
          
          .scope-selector {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          .scope-radio {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          
          .status-message {
            padding: 8px 12px;
            border-radius: 3px;
            margin-bottom: 12px;
            font-size: 12px;
            display: none;
          }
          
          .status-message.success {
            background: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            border-left: 4px solid var(--vscode-testing-iconPassed);
            display: block;
          }
          
          .status-message.error {
            background: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            border-left: 4px solid var(--vscode-testing-iconFailed);
            display: block;
          }
          
          .settings-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 16px;
            background: var(--vscode-editor-background);
          }
          
          .settings-table thead {
            background: var(--vscode-list-hoverBackground);
            border-bottom: 2px solid var(--vscode-panel-border);
          }
          
          .settings-table th {
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            color: var(--vscode-editor-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .settings-table tbody tr {
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .settings-table tbody tr:hover {
            background: var(--vscode-list-hoverBackground);
          }
          
          .settings-table tbody tr:last-child {
            border-bottom: none;
          }
          
          .settings-table td {
            padding: 10px 12px;
            vertical-align: middle;
            color: var(--vscode-editor-foreground);
            font-size: 12px;
          }
          
          .settings-table td:first-child {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .settings-table .table-input {
            max-width: 150px;
            margin: 0;
          }
          
          .setting-name {
            font-weight: 500;
          }
          
          .tooltip-icon {
            margin-left: 8px;
            cursor: help;
            opacity: 0.6;
            font-size: 14px;
            vertical-align: middle;
            position: relative;
          }
          
          .tooltip-icon:hover {
            opacity: 1;
          }
          
          .tooltip-icon::after {
            content: attr(title);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            padding: 6px 10px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            margin-bottom: 5px;
            max-width: 300px;
            white-space: normal;
            text-align: left;
          }
          
          .tooltip-icon:hover::after {
            opacity: 1;
            pointer-events: auto;
          }
          
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          }
          
          .modal-content {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            min-width: 400px;
            max-width: 500px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          }
          
          .modal-header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
          }
          
          .modal-body {
            padding: 16px;
            color: var(--vscode-editor-foreground);
            font-size: 13px;
            line-height: 1.5;
          }
          
          .modal-body p {
            margin: 0 0 12px 0;
          }
          
          .modal-body p:last-child {
            margin-bottom: 0;
          }
          
          .modal-footer {
            padding: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }
        </style>
      </head>
      <body>
        <div class="settings-container">
          <div class="settings-header">
            <div class="settings-title">Performance Settings</div>
            <div class="settings-controls">
              <button id="save-btn" class="btn" disabled>Save</button>
              <button id="reset-btn" class="btn btn-secondary">Reset to Defaults</button>
            </div>
          </div>
          <div class="settings-content" id="settings-content">
            <div id="status-message" class="status-message"></div>
            <!-- Settings will be rendered by JavaScript -->
          </div>
          <!-- Reload Prompt Modal -->
          <div id="reload-modal" class="modal-overlay" style="display: none;">
            <div class="modal-content">
              <div class="modal-header">
                <h3>Reload Workspace</h3>
              </div>
              <div class="modal-body">
                <p>Save performance settings and reload the workspace?</p>
                <p>The workspace needs to be reloaded for the changes to take effect.</p>
              </div>
              <div class="modal-footer">
                <button id="reload-cancel-btn" class="btn btn-secondary">Cancel</button>
                <button id="reload-accept-btn" class="btn">Reload</button>
              </div>
            </div>
          </div>
          <div class="footer">
            <div class="scope-selector">
              <span>Save to:</span>
              <label class="scope-radio">
                <input type="radio" name="scope" value="workspace" checked>
                <span>Workspace</span>
              </label>
              <label class="scope-radio">
                <input type="radio" name="scope" value="user">
                <span>User</span>
              </label>
            </div>
            <div id="last-save">Ready</div>
          </div>
        </div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const initialSettings = ${encodedSettings};
          window.vscode = vscode;
          window.initialSettings = initialSettings;
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
