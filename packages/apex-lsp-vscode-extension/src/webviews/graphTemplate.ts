/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

/**
 * HTML template for the Apex Symbol Graph webview
 */

export function getGraphWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  graphData: any,
): string {
  const nonce = getNonce();
  const encodedData = JSON.stringify(graphData);

  // Use proper webview URI construction - script is in dist/webview/
  // Use bundled script that includes graphRenderer
  const scriptPath = vscode.Uri.joinPath(
    extensionUri,
    'dist',
    'webview',
    'graphScript.bundle.js',
  );
  const scriptUri = webview.asWebviewUri(scriptPath);

  // Debug logging
  console.log('Extension URI:', extensionUri.toString());
  console.log('Script path:', scriptPath.toString());
  console.log('Script URI:', scriptUri.toString());
  console.log('CSP Source:', webview.cspSource);

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
          }
          
          #graph {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--vscode-editor-background);
            cursor: grab;
          }
          
          #graph:active {
            cursor: grabbing;
          }
          
          .graph-container {
            position: relative;
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          
          .canvas-wrapper {
            flex: 1;
            position: relative;
            min-height: 0; /* Important for flexbox */
            overflow: hidden;
          }
          
          .graph-info {
            position: absolute;
            top: 10px;
            left: 10px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 12px;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .graph-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
          }
          
          .dropdown {
            position: relative;
            display: inline-block;
          }
          
          .dropdown-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 3px;
            padding: 6px 12px;
            font-size: 11px;
            cursor: pointer;
            transition: background-color 0.2s;
            min-width: 120px;
          }
          
          .dropdown-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .dropdown-content {
            display: none;
            position: absolute;
            right: 0;
            background: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 3px;
            min-width: 150px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            z-index: 1000;
          }
          
          .dropdown-content a {
            color: var(--vscode-foreground);
            padding: 8px 12px;
            text-decoration: none;
            display: block;
            font-size: 11px;
            border-bottom: 1px solid var(--vscode-dropdown-border);
          }
          
          .dropdown-content a:last-child {
            border-bottom: none;
          }
          
          .dropdown-content a:hover {
            background: var(--vscode-list-hoverBackground);
          }
          
          .dropdown-divider {
            height: 1px;
            background: var(--vscode-dropdown-border);
            margin: 4px 0;
          }
          
          .dropdown-section {
            color: var(--vscode-foreground);
            padding: 6px 12px 2px 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            opacity: 0.7;
          }
          
          .layout-option {
            padding-left: 24px !important;
            position: relative;
          }
          
          .layout-option.active {
            background: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
          }
          
          .layout-option.active::before {
            content: "✓";
            position: absolute;
            left: 8px;
            font-weight: bold;
          }
          
          .dropdown:hover .dropdown-content {
            display: block;
          }
          
          .graph-legend {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            font-size: 11px;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            max-width: 200px;
          }
          
          .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
          }
          
          .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 6px;
          }
          
          .legend-edge {
            width: 20px;
            height: 2px;
            margin-right: 6px;
            border-radius: 1px;
          }
          
          #graph {
            flex: 1;
            cursor: grab;
          }
          
          #graph:active {
            cursor: grabbing;
          }
          
          .node-tooltip {
            position: absolute;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px;
            font-size: 11px;
            pointer-events: none;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            max-width: 300px;
          }
        </style>
      </head>
      <body>
        <div class="graph-container">
          <div class="graph-info">
            <strong>Apex Symbol Graph</strong><br/>
            Nodes: ${graphData.nodes?.length || 0} | Edges: ${graphData.edges?.length || 0}
          </div>
          <div class="graph-controls">
            <div class="dropdown">
              <button id="graph-menu-btn" class="dropdown-btn">
                Graph Controls ▼
              </button>
              <div id="graph-menu" class="dropdown-content">
                <a href="#" id="reset-btn">Reset View</a>
                <a href="#" id="center-btn">Center Graph</a>
                <a href="#" id="fit-btn">Fit to View</a>
                <a href="#" id="toggle-labels-btn">Toggle Labels</a>
                <div class="dropdown-divider"></div>
                <div class="dropdown-section">Layout Algorithm:</div>
                <a href="#" id="layout-forceatlas2-btn" class="layout-option active">ForceAtlas2</a>
                <a href="#" id="layout-force-btn" class="layout-option">Force</a>
                <a href="#" id="layout-dagre-btn" class="layout-option">Dagre (Hierarchical)</a>
                <a href="#" id="layout-circular-btn" class="layout-option">Circular</a>
                <a href="#" id="layout-grid-btn" class="layout-option">Grid</a>
                <a href="#" id="layout-random-btn" class="layout-option">Random</a>
                <div class="dropdown-divider"></div>
                <a href="#" id="restart-simulation-btn">Restart Layout</a>
              </div>
            </div>
          </div>
          <div class="graph-legend">
            <div style="font-weight: bold; margin-bottom: 4px;">Node Types:</div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #4CAF50;"></div>
              <span>Class</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #2196F3;"></div>
              <span>Method</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #FF9800;"></div>
              <span>Property</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #9C27B0;"></div>
              <span>Namespace</span>
            </div>
            <div style="font-weight: bold; margin: 8px 0 4px 0;">Relationships:</div>
            <div class="legend-item">
              <div class="legend-edge" style="background-color: #4CAF50;"></div>
              <span>Contains</span>
            </div>
            <div class="legend-item">
              <div class="legend-edge" style="background-color: #2196F3;"></div>
              <span>Calls</span>
            </div>
            <div class="legend-item">
              <div class="legend-edge" style="background-color: #FF9800;"></div>
              <span>References</span>
            </div>
          </div>
          <div class="canvas-wrapper">
            <canvas id="graph"></canvas>
          </div>
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        <script nonce="${nonce}">
          // Set the graph data for the external script
          window.graphData = ${encodedData};
          
          // Debug: Log the script URL
          console.log('Script URL:', '${scriptUri}');
        </script>
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
