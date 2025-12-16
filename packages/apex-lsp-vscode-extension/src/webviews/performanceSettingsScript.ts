/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Main script for the Performance Settings webview
 * Handles form rendering, validation, and communication with extension host
 */

// Global variables for the webview (provided by webview HTML)
interface WindowWithVSCode extends Window {
  vscode?: any;
  initialSettings?: any;
}

// Type-only declarations for webview globals (avoid redeclaration conflicts)
declare function acquireVsCodeApi(): any;
declare const initialSettings: any;

interface PerformanceSettings {
  deferredReferenceProcessing?: {
    deferredBatchSize: number;
    maxRetryAttempts: number;
    retryDelayMs: number;
    maxRetryDelayMs: number;
    queueCapacityThreshold: number;
    queueDrainThreshold: number;
    queueFullRetryDelayMs: number;
    maxQueueFullRetryDelayMs: number;
    circuitBreakerFailureThreshold: number;
    circuitBreakerResetThreshold: number;
  };
  queueProcessing?: {
    maxConcurrency: Record<string, number>;
    yieldInterval: number;
    yieldDelayMs: number;
  };
  scheduler?: {
    queueCapacity: Record<string, number> | number;
    maxHighPriorityStreak: number;
    idleSleepMs: number;
  };
  performance?: {
    commentCollectionMaxFileSize: number;
    useAsyncCommentProcessing: boolean;
    documentChangeDebounceMs: number;
  };
  commentCollection?: {
    enableCommentCollection: boolean;
    includeSingleLineComments: boolean;
    associateCommentsWithSymbols: boolean;
    enableForDocumentChanges: boolean;
    enableForDocumentOpen: boolean;
    enableForDocumentSymbols: boolean;
    enableForFoldingRanges: boolean;
  };
}

const PRIORITIES = [
  { key: 'CRITICAL', label: 'Critical (Ephemeral)', badge: 'critical' },
  { key: 'IMMEDIATE', label: 'Immediate', badge: 'immediate' },
  { key: 'HIGH', label: 'High', badge: 'high' },
  { key: 'NORMAL', label: 'Normal', badge: 'normal' },
  { key: 'LOW', label: 'Low', badge: 'low' },
  { key: 'BACKGROUND', label: 'Background', badge: 'background' },
] as const;

class PerformanceSettingsUI {
  private vscode: any;
  private currentSettings: any;
  private originalSettings: any;
  private expandedSections: Set<string> = new Set(['queueSettings']);
  private isDirty: boolean = false;

  constructor() {
    const win = window as unknown as WindowWithVSCode;
    this.vscode = win.vscode || acquireVsCodeApi();
    this.currentSettings = win.initialSettings || initialSettings;
    this.originalSettings = JSON.parse(JSON.stringify(this.currentSettings)); // Deep copy
    this.setupEventListeners();
    this.setupMessageListener();
    this.render();
    this.updateSaveButtonState();
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'settingsLoaded':
          this.currentSettings = message.settings;
          this.originalSettings = JSON.parse(JSON.stringify(this.currentSettings)); // Deep copy
          this.isDirty = false;
          this.updateSaveButtonState();
          this.render();
          break;
        case 'settingsSaved':
          if (message.success) {
            // Update original settings to current settings after successful save
            this.originalSettings = JSON.parse(JSON.stringify(this.currentSettings));
            this.isDirty = false;
            this.updateSaveButtonState();
            this.showStatus('Settings saved successfully', 'success');
            this.updateLastSave();
          } else {
            this.showStatus(`Failed to save: ${message.error}`, 'error');
          }
          break;
        case 'resetComplete':
          if (message.success) {
            this.showStatus(`Reset ${message.section} to defaults`, 'success');
          } else {
            this.showStatus(`Failed to reset: ${message.error}`, 'error');
          }
          break;
      }
    });
  }

  private setupEventListeners(): void {
    // Save button
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetToDefaults());
    }

    // Reload modal buttons
    const reloadAcceptBtn = document.getElementById('reload-accept-btn');
    if (reloadAcceptBtn) {
      reloadAcceptBtn.addEventListener('click', () => this.handleReloadAccept());
    }

    const reloadCancelBtn = document.getElementById('reload-cancel-btn');
    if (reloadCancelBtn) {
      reloadCancelBtn.addEventListener('click', () => this.handleReloadCancel());
    }

    // Section toggles
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const header = target.closest('.section-header');
      if (header) {
        const section = header.parentElement;
        if (section) {
          const sectionId = section.id;
          this.toggleSection(sectionId);
        }
      }
    });

  }

  private checkDirtyState(): void {
    const current = this.collectSettings();
    const original = this.originalSettings?.apex || {};
    this.isDirty = JSON.stringify(current) !== JSON.stringify(original);
    this.updateSaveButtonState();
  }

  private updateSaveButtonState(): void {
    const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = !this.isDirty;
    }
  }

  private toggleSection(sectionId: string): void {
    if (this.expandedSections.has(sectionId)) {
      this.expandedSections.delete(sectionId);
    } else {
      this.expandedSections.add(sectionId);
    }
    this.render();
  }

  private render(): void {
    const content = document.getElementById('settings-content');
    if (!content) return;

    const settings = this.currentSettings?.apex || {};

    content.innerHTML = `
      <div id="status-message" class="status-message"></div>
      ${this.renderQueueSettings(settings.queueProcessing, settings.scheduler)}
      ${this.renderDeferredReferenceProcessing(settings.deferredReferenceProcessing)}
      ${this.renderPerformance(settings.performance)}
      ${this.renderCommentCollection(settings.commentCollection)}
    `;
    
    // Re-attach event listeners and update button state after render
    this.setupInputListeners();
    this.updateSaveButtonState();
  }

  private setupInputListeners(): void {
    // Track input changes for dirty state
    const inputs = document.querySelectorAll('.setting-input, input[type="checkbox"]');
    inputs.forEach((input) => {
      input.addEventListener('input', () => this.checkDirtyState());
      input.addEventListener('change', () => this.checkDirtyState());
    });
  }

  private renderDeferredReferenceProcessing(settings: any): string {
    const expanded = this.expandedSections.has('deferredReferenceProcessing');
    const def = settings || {
      deferredBatchSize: 50,
      maxRetryAttempts: 10,
      retryDelayMs: 100,
      maxRetryDelayMs: 5000,
      queueCapacityThreshold: 90,
      queueDrainThreshold: 75,
      queueFullRetryDelayMs: 10000,
      maxQueueFullRetryDelayMs: 30000,
      circuitBreakerFailureThreshold: 5,
      circuitBreakerResetThreshold: 50,
    };

    const deferredSettings = [
      {
        key: 'deferredBatchSize',
        label: 'Deferred Batch Size',
        value: def.deferredBatchSize,
        min: 1,
        max: 1000,
        tooltip: 'Batch size for processing deferred references (default: 50)',
      },
      {
        key: 'maxRetryAttempts',
        label: 'Max Retry Attempts',
        value: def.maxRetryAttempts,
        min: 0,
        max: 100,
        tooltip: 'Maximum number of retry attempts (0 to disable retries, default: 10)',
      },
      {
        key: 'retryDelayMs',
        label: 'Retry Delay (ms)',
        value: def.retryDelayMs,
        min: 10,
        max: 10000,
        tooltip: 'Initial retry delay in milliseconds (default: 100)',
      },
      {
        key: 'maxRetryDelayMs',
        label: 'Max Retry Delay (ms)',
        value: def.maxRetryDelayMs,
        min: 1000,
        max: 60000,
        tooltip: 'Maximum retry delay for exponential backoff (default: 5000)',
      },
      {
        key: 'queueCapacityThreshold',
        label: 'Queue Capacity Threshold (%)',
        value: def.queueCapacityThreshold,
        min: 0,
        max: 100,
        tooltip: "Don't retry if queue exceeds this percentage (default: 90)",
      },
      {
        key: 'queueDrainThreshold',
        label: 'Queue Drain Threshold (%)',
        value: def.queueDrainThreshold,
        min: 0,
        max: 100,
        tooltip: 'Only retry when queue is below this percentage (default: 75)',
      },
      {
        key: 'queueFullRetryDelayMs',
        label: 'Queue Full Retry Delay (ms)',
        value: def.queueFullRetryDelayMs,
        min: 1000,
        max: 60000,
        tooltip: 'Delay when queue is full (default: 10000)',
      },
      {
        key: 'maxQueueFullRetryDelayMs',
        label: 'Max Queue Full Retry Delay (ms)',
        value: def.maxQueueFullRetryDelayMs,
        min: 1000,
        max: 120000,
        tooltip: 'Maximum delay when queue is full (default: 30000)',
      },
      {
        key: 'circuitBreakerFailureThreshold',
        label: 'Circuit Breaker Failure Threshold',
        value: def.circuitBreakerFailureThreshold,
        min: 1,
        max: 50,
        tooltip: 'Consecutive failures before activating circuit breaker (default: 5)',
      },
      {
        key: 'circuitBreakerResetThreshold',
        label: 'Circuit Breaker Reset Threshold (%)',
        value: def.circuitBreakerResetThreshold,
        min: 0,
        max: 100,
        tooltip: 'Queue capacity percentage to reset circuit breaker (default: 50)',
      },
    ];

    return `
      <div class="settings-section" id="deferredReferenceProcessing">
        <div class="section-header">
          <div class="section-title">Deferred Reference Processing</div>
          <div class="section-toggle">${expanded ? '▼' : '▶'}</div>
        </div>
        <div class="section-content ${expanded ? 'expanded' : ''}">
          <div class="setting-group">
            <table class="settings-table">
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                ${deferredSettings
                  .map(
                    (s) => `
                  <tr>
                    <td>
                      <span class="setting-name">${s.label}</span>
                      <span class="tooltip-icon" title="${s.tooltip}">ℹ️</span>
                    </td>
                    <td>
                      <input type="number" class="setting-input table-input" 
                             data-path="deferredReferenceProcessing.${s.key}"
                             value="${s.value}" min="${s.min}" max="${s.max}">
                    </td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private renderQueueSettings(queueProcessingSettings: any, schedulerSettings: any): string {
    const expanded = this.expandedSections.has('queueSettings');
    
    // Queue Processing defaults
    const queueDef = queueProcessingSettings || {
      maxConcurrency: {
        CRITICAL: 100,
        IMMEDIATE: 50,
        HIGH: 50,
        NORMAL: 25,
        LOW: 10,
        BACKGROUND: 5,
      },
      yieldInterval: 50,
      yieldDelayMs: 25,
    };
    const maxConcurrency = queueDef.maxConcurrency || {};

    // Scheduler defaults
    const schedulerDef = schedulerSettings || {
      queueCapacity: {
        CRITICAL: 200,
        IMMEDIATE: 200,
        HIGH: 200,
        NORMAL: 200,
        LOW: 200,
        BACKGROUND: 200,
      },
      maxHighPriorityStreak: 50,
      idleSleepMs: 1,
    };
    const queueCapacity =
      typeof schedulerDef.queueCapacity === 'number'
        ? {
            CRITICAL: schedulerDef.queueCapacity,
            IMMEDIATE: schedulerDef.queueCapacity,
            HIGH: schedulerDef.queueCapacity,
            NORMAL: schedulerDef.queueCapacity,
            LOW: schedulerDef.queueCapacity,
            BACKGROUND: schedulerDef.queueCapacity,
          }
        : schedulerDef.queueCapacity || {};

    return `
      <div class="settings-section" id="queueSettings">
        <div class="section-header">
          <div class="section-title">Queue & Scheduler Settings</div>
          <div class="section-toggle">${expanded ? '▼' : '▶'}</div>
        </div>
        <div class="section-content ${expanded ? 'expanded' : ''}">
          <div class="setting-group">
            <div class="setting-group-title">Queue Configuration per Priority</div>
            <table class="settings-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Queue Capacity</th>
                  <th>Max Concurrency</th>
                </tr>
              </thead>
              <tbody>
                ${PRIORITIES.map(
                  (p) => `
                  <tr>
                    <td>
                      <span class="priority-badge ${p.badge}">${p.key}</span>
                      <span style="margin-left: 8px;">${p.label}</span>
                    </td>
                    <td>
                      <input type="number" class="setting-input table-input" 
                             data-path="scheduler.queueCapacity.${p.key}"
                             value="${queueCapacity[p.key] || ''}" min="1" max="10000">
                    </td>
                    <td>
                      <input type="number" class="setting-input table-input" 
                             data-path="queueProcessing.maxConcurrency.${p.key}"
                             value="${maxConcurrency[p.key] || ''}" min="1" max="1000">
                    </td>
                  </tr>
                `,
                ).join('')}
              </tbody>
            </table>
          </div>
          <div class="setting-group">
            <div class="setting-group-title">Queue Processing Settings</div>
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Yield Interval</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="queueProcessing.yieldInterval"
                     value="${queueDef.yieldInterval}" min="1" max="1000">
              <div class="setting-help">Tasks processed before yielding control (default: 50)</div>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Yield Delay (ms)</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="queueProcessing.yieldDelayMs"
                     value="${queueDef.yieldDelayMs}" min="1" max="1000">
              <div class="setting-help">Delay when yielding control (default: 25)</div>
            </div>
          </div>
          <div class="setting-group">
            <div class="setting-group-title">Scheduler Settings</div>
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Max High Priority Streak</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="scheduler.maxHighPriorityStreak"
                     value="${schedulerDef.maxHighPriorityStreak}" min="1" max="1000">
              <div class="setting-help">High-priority tasks before starvation relief (default: 50)</div>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Idle Sleep (ms)</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="scheduler.idleSleepMs"
                     value="${schedulerDef.idleSleepMs}" min="1" max="1000">
              <div class="setting-help">Sleep duration when no tasks available (default: 1)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderQueueProcessing(settings: any): string {
    const expanded = this.expandedSections.has('queueProcessing');
    const def = settings || {
      maxConcurrency: {
        CRITICAL: 100,
        IMMEDIATE: 50,
        HIGH: 50,
        NORMAL: 25,
        LOW: 10,
        BACKGROUND: 5,
      },
      yieldInterval: 50,
      yieldDelayMs: 25,
    };
    const maxConcurrency = def.maxConcurrency || {};

    return `
      <div class="settings-section" id="queueProcessing">
        <div class="section-header">
          <div class="section-title">Queue Processing</div>
          <div class="section-toggle">${expanded ? '▼' : '▶'}</div>
        </div>
        <div class="section-content ${expanded ? 'expanded' : ''}">
          <div class="setting-group">
            <div class="setting-group-title">Max Concurrency per Priority</div>
            <table class="settings-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Max Concurrency</th>
                </tr>
              </thead>
              <tbody>
                ${PRIORITIES.map(
                  (p) => `
                  <tr>
                    <td>
                      <span class="priority-badge ${p.badge}">${p.key}</span>
                      <span style="margin-left: 8px;">${p.label}</span>
                    </td>
                    <td>
                      <input type="number" class="setting-input table-input" 
                             data-path="queueProcessing.maxConcurrency.${p.key}"
                             value="${maxConcurrency[p.key] || ''}" min="1" max="1000">
                    </td>
                  </tr>
                `,
                ).join('')}
              </tbody>
            </table>
          </div>
          <div class="setting-group">
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Yield Interval</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="queueProcessing.yieldInterval"
                     value="${def.yieldInterval}" min="1" max="1000">
              <div class="setting-help">Tasks processed before yielding control (default: 50)</div>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Yield Delay (ms)</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="queueProcessing.yieldDelayMs"
                     value="${def.yieldDelayMs}" min="1" max="1000">
              <div class="setting-help">Delay when yielding control (default: 25)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderScheduler(settings: any): string {
    const expanded = this.expandedSections.has('scheduler');
    const def = settings || {
      queueCapacity: {
        CRITICAL: 200,
        IMMEDIATE: 200,
        HIGH: 200,
        NORMAL: 200,
        LOW: 200,
        BACKGROUND: 200,
      },
      maxHighPriorityStreak: 50,
      idleSleepMs: 1,
    };
    const queueCapacity =
      typeof def.queueCapacity === 'number'
        ? {
            CRITICAL: def.queueCapacity,
            IMMEDIATE: def.queueCapacity,
            HIGH: def.queueCapacity,
            NORMAL: def.queueCapacity,
            LOW: def.queueCapacity,
            BACKGROUND: def.queueCapacity,
          }
        : def.queueCapacity || {};

    return `
      <div class="settings-section" id="scheduler">
        <div class="section-header">
          <div class="section-title">Scheduler</div>
          <div class="section-toggle">${expanded ? '▼' : '▶'}</div>
        </div>
        <div class="section-content ${expanded ? 'expanded' : ''}">
          <div class="setting-group">
            <div class="setting-group-title">Queue Capacity per Priority</div>
            <table class="settings-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Queue Capacity</th>
                </tr>
              </thead>
              <tbody>
                ${PRIORITIES.map(
                  (p) => `
                  <tr>
                    <td>
                      <span class="priority-badge ${p.badge}">${p.key}</span>
                      <span style="margin-left: 8px;">${p.label}</span>
                    </td>
                    <td>
                      <input type="number" class="setting-input table-input" 
                             data-path="scheduler.queueCapacity.${p.key}"
                             value="${queueCapacity[p.key] || ''}" min="1" max="10000">
                    </td>
                  </tr>
                `,
                ).join('')}
              </tbody>
            </table>
          </div>
          <div class="setting-group">
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Max High Priority Streak</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="scheduler.maxHighPriorityStreak"
                     value="${def.maxHighPriorityStreak}" min="1" max="1000">
              <div class="setting-help">High-priority tasks before starvation relief (default: 50)</div>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Idle Sleep (ms)</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="scheduler.idleSleepMs"
                     value="${def.idleSleepMs}" min="1" max="1000">
              <div class="setting-help">Sleep duration when no tasks available (default: 1)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderPerformance(settings: any): string {
    const expanded = this.expandedSections.has('performance');
    const def = settings || {
      commentCollectionMaxFileSize: 102400,
      useAsyncCommentProcessing: true,
      documentChangeDebounceMs: 300,
    };

    return `
      <div class="settings-section" id="performance">
        <div class="section-header">
          <div class="section-title">Performance</div>
          <div class="section-toggle">${expanded ? '▼' : '▶'}</div>
        </div>
        <div class="section-content ${expanded ? 'expanded' : ''}">
          <div class="setting-group">
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Comment Collection Max File Size (bytes)</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="performance.commentCollectionMaxFileSize"
                     value="${def.commentCollectionMaxFileSize}" min="0" max="10485760">
              <div class="setting-help">Maximum file size for comment collection (default: 102400)</div>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="performance.useAsyncCommentProcessing"
                       ${def.useAsyncCommentProcessing ? 'checked' : ''}>
                <span class="setting-label-text">Use Async Comment Processing</span>
              </label>
              <div class="setting-help">Use asynchronous processing for large files (default: true)</div>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span class="setting-label-text">Document Change Debounce (ms)</span>
              </label>
              <input type="number" class="setting-input" 
                     data-path="performance.documentChangeDebounceMs"
                     value="${def.documentChangeDebounceMs}" min="0" max="5000">
              <div class="setting-help">Debounce delay for document changes (default: 300)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCommentCollection(settings: any): string {
    const expanded = this.expandedSections.has('commentCollection');
    const def = settings || {
      enableCommentCollection: true,
      includeSingleLineComments: false,
      associateCommentsWithSymbols: false,
      enableForDocumentChanges: true,
      enableForDocumentOpen: true,
      enableForDocumentSymbols: false,
      enableForFoldingRanges: false,
    };

    return `
      <div class="settings-section" id="commentCollection">
        <div class="section-header">
          <div class="section-title">Comment Collection</div>
          <div class="section-toggle">${expanded ? '▼' : '▶'}</div>
        </div>
        <div class="section-content ${expanded ? 'expanded' : ''}">
          <div class="setting-group">
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="commentCollection.enableCommentCollection"
                       ${def.enableCommentCollection ? 'checked' : ''}>
                <span class="setting-label-text">Enable Comment Collection</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="commentCollection.includeSingleLineComments"
                       ${def.includeSingleLineComments ? 'checked' : ''}>
                <span class="setting-label-text">Include Single-Line Comments</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="commentCollection.associateCommentsWithSymbols"
                       ${def.associateCommentsWithSymbols ? 'checked' : ''}>
                <span class="setting-label-text">Associate Comments with Symbols</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="commentCollection.enableForDocumentChanges"
                       ${def.enableForDocumentChanges ? 'checked' : ''}>
                <span class="setting-label-text">Enable for Document Changes</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="commentCollection.enableForDocumentOpen"
                       ${def.enableForDocumentOpen ? 'checked' : ''}>
                <span class="setting-label-text">Enable for Document Open</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="commentCollection.enableForDocumentSymbols"
                       ${def.enableForDocumentSymbols ? 'checked' : ''}>
                <span class="setting-label-text">Enable for Document Symbols</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" 
                       data-path="commentCollection.enableForFoldingRanges"
                       ${def.enableForFoldingRanges ? 'checked' : ''}>
                <span class="setting-label-text">Enable for Folding Ranges</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private collectSettings(): PerformanceSettings {
    const settings: any = {};
    const inputs = document.querySelectorAll<HTMLInputElement>(
      '.setting-input, input[type="checkbox"]',
    );

    inputs.forEach((input) => {
      const path = input.getAttribute('data-path');
      if (!path) return;

      const parts = path.split('.');
      let current = settings;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      const lastPart = parts[parts.length - 1];
      if (input.type === 'checkbox') {
        current[lastPart] = input.checked;
      } else {
        const value = parseInt(input.value, 10);
        if (!isNaN(value)) {
          current[lastPart] = value;
        }
      }
    });

    return settings;
  }

  private saveSettings(): void {
    // Show confirmation modal before saving
    this.showReloadPrompt();
  }

  private resetToDefaults(): void {
    const scopeRadio = document.querySelector<HTMLInputElement>(
      'input[name="scope"]:checked',
    );
    const scope = scopeRadio?.value || 'workspace';

    // Reset all sections
    const sections = [
      'deferredReferenceProcessing',
      'queueProcessing',
      'scheduler',
      'performance',
      'commentCollection',
    ];

    sections.forEach((section) => {
      this.vscode.postMessage({
        type: 'resetToDefaults',
        section,
        scope,
      });
    });
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-message ${type}`;
      setTimeout(() => {
        statusEl.className = 'status-message';
      }, 3000);
    }
  }

  private showReloadPrompt(): void {
    const modal = document.getElementById('reload-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  private hideReloadPrompt(): void {
    const modal = document.getElementById('reload-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private handleReloadAccept(): void {
    this.hideReloadPrompt();
    // Save settings and then reload
    const settings = this.collectSettings();
    const scopeRadio = document.querySelector<HTMLInputElement>(
      'input[name="scope"]:checked',
    );
    const scope = scopeRadio?.value || 'workspace';

    this.vscode.postMessage({
      type: 'saveSettingsAndReload',
      settings,
      scope,
    });
  }

  private handleReloadCancel(): void {
    this.hideReloadPrompt();
  }

  private updateLastSave(): void {
    const lastSave = document.getElementById('last-save');
    if (lastSave) {
      const now = new Date();
      lastSave.textContent = `Last saved: ${now.toLocaleTimeString()}`;
    }
  }
}

// Initialize when page loads
function initSettingsUI() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new PerformanceSettingsUI();
    });
  } else {
    new PerformanceSettingsUI();
  }
}

initSettingsUI();

