/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as monaco from 'monaco-editor';

import { setupApexLanguageClient } from './setupApexLanguageClient';
import { registerApexLanguage } from './apexLanguage';
import { loadExampleCode } from './examples';

// Initialize the editor
let editor: monaco.editor.IStandaloneCodeEditor;

// Register the Apex language with Monaco
registerApexLanguage();

// Initialize the editor with default settings
function initializeEditor() {
  editor = monaco.editor.create(document.getElementById('editor')!, {
    value: '// Start typing Apex code here...',
    language: 'apex',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: {
      enabled: true,
    },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    glyphMargin: true,
    folding: true,
    fontSize: 14,
    renderLineHighlight: 'all',
  });

  // Setup the Apex language client and connect it to the editor
  setupApexLanguageClient(editor);

  // Set up event listeners for toolbar actions
  const runButton = document.getElementById('run-btn') as HTMLButtonElement;
  runButton.addEventListener('click', () => {
    console.log('Run button clicked');
    // In a real implementation, this would send the code to a backend for execution
    alert('Apex execution is not implemented in this demo.');
  });

  // Handle example selection
  const exampleSelector = document.getElementById(
    'examples',
  ) as HTMLSelectElement;
  exampleSelector.addEventListener('change', () => {
    if (exampleSelector.value) {
      const exampleCode = loadExampleCode(exampleSelector.value);
      editor.setValue(exampleCode);
    }
  });
}

// Wait for the DOM to be ready before initializing
document.addEventListener('DOMContentLoaded', initializeEditor);

// Export the editor instance for easier debugging
(window as any).editor = editor;
