/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Main script for the Apex Symbol Graph webview
 * This file will be compiled to JavaScript and loaded by the webview
 */

import { GraphRenderer, GraphData } from './graphRenderer';

// Global variables for the webview
declare const acquireVsCodeApi: () => any;
declare const graphData: GraphData;

// Extend Window interface to include our custom properties
interface WindowWithGraphData extends Window {
  graphData?: GraphData;
}

// Initialize the graph when the page loads
function initGraph() {
  console.log('Initializing graph from external script...');

  const canvas = document.getElementById('graph') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Get graph data from window or use global
  const win = window as unknown as WindowWithGraphData;
  const data = win.graphData || graphData;
  if (!data) {
    console.error('Graph data not found');
    return;
  }

  console.log('Graph data:', data);
  console.log('Nodes:', data.nodes?.length || 0);
  console.log('Edges:', data.edges?.length || 0);

  const vscode = acquireVsCodeApi();
  const renderer = new GraphRenderer(canvas, vscode);

  // Initialize with the graph data
  renderer.initGraph(data);

  console.log('Graph initialized successfully');
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGraph);
} else {
  initGraph();
}
