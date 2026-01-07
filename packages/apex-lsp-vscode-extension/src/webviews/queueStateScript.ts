/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Main script for the Queue State Dashboard webview
 * Handles polling, data rendering, and user interactions
 */

// Global variables for the webview (provided by webview HTML)
interface WindowWithVSCode extends Window {
  vscode?: any;
  initialData?: any;
}

// Type-only declarations for webview globals (avoid redeclaration conflicts)
declare function acquireVsCodeApi(): any;
declare const initialData: any;

interface QueueStateData {
  metrics: {
    queueSizes: Record<number, number>;
    tasksStarted: number;
    tasksCompleted: number;
    tasksDropped: number;
    requestTypeBreakdown?: Record<number, Record<string, number>>;
    queuedRequestTypeBreakdown?: Record<number, Record<string, number>>;
    activeRequestTypeBreakdown?: Record<number, Record<string, number>>;
    queueUtilization?: Record<number, number>;
    activeTasks?: Record<number, number>;
    queueCapacity?: number | Record<number, number>;
  };
  metadata: {
    timestamp: number;
    processingTime: number;
  };
}

// Priority names mapping (Priority enum values: Immediate=1, High=2, Normal=3, Low=4, Background=5)
const PRIORITY_NAMES: Record<number, string> = {
  1: 'Immediate',
  2: 'High',
  3: 'Normal',
  4: 'Low',
  5: 'Background',
};

// Priority colors
const PRIORITY_COLORS: Record<number, string> = {
  1: '#F44336', // Red - Immediate
  2: '#FF9800', // Orange - High
  3: '#2196F3', // Blue - Normal
  4: '#4CAF50', // Green - Low
  5: '#9E9E9E', // Gray - Background
};

class QueueStateDashboard {
  private vscode: any;
  private currentData: QueueStateData | null = null;
  private priorityTogglesSetup: boolean = false;
  private expandedPriorities: Set<number> = new Set();

  constructor() {
    // Get vscode API from window (set by inline script) or acquire if not set
    const win = window as unknown as WindowWithVSCode;
    this.vscode = win.vscode || acquireVsCodeApi();
    // Get initial data from window or use global
    this.currentData = win.initialData || initialData;
    this.setupEventListeners();
    this.setupMessageListener();
    if (this.currentData) {
      this.render(this.currentData);
    }
  }

  private setupMessageListener(): void {
    // Single message listener for all messages from the extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('[QueueStateDashboard] Received message:', message.type);
      switch (message.type) {
        case 'queueStateData':
          // Real-time update received from scheduler loop or manual refresh
          console.log(
            '[QueueStateDashboard] Updating dashboard with new data',
            message.data,
          );
          this.currentData = message.data;
          if (this.currentData) {
            this.render(this.currentData);
            this.updateLastUpdateTime();
          }
          break;
        case 'error':
          console.error(
            '[QueueStateDashboard] Error from extension:',
            message.message,
          );
          this.showError(message.message || 'Unknown error');
          break;
        default:
          console.log(
            '[QueueStateDashboard] Unknown message type:',
            message.type,
          );
      }
    });
  }

  private setupEventListeners(): void {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[QueueStateDashboard] Refresh button clicked');
        this.refresh();
      });
    }
  }

  private refresh(): void {
    this.vscode.postMessage({ type: 'refresh' });
  }

  private render(data: QueueStateData): void {
    const content = document.getElementById('dashboard-content');
    if (!content) {
      console.error('Dashboard content element not found');
      return;
    }

    if (!data || !data.metrics) {
      console.error('Invalid data structure:', data);
      this.showError('Invalid queue state data received');
      return;
    }

    console.log('Rendering queue state data:', data);
    const metrics = data.metrics;
    const queueSizes = metrics.queueSizes || {};
    const utilization = metrics.queueUtilization || {};
    const activeTasks = metrics.activeTasks || {};
    const requestTypeBreakdown = metrics.requestTypeBreakdown || {};
    const queuedRequestTypeBreakdown = metrics.queuedRequestTypeBreakdown || {};
    const activeRequestTypeBreakdown = metrics.activeRequestTypeBreakdown || {};
    // Handle both legacy single number and per-priority Record
    const queueCapacityValue = metrics.queueCapacity;
    const queueCapacityPerPriority: Record<number, number> =
      typeof queueCapacityValue === 'number'
        ? {
            1: queueCapacityValue,
            2: queueCapacityValue,
            3: queueCapacityValue,
            4: queueCapacityValue,
            5: queueCapacityValue,
          }
        : queueCapacityValue || { 1: 200, 2: 200, 3: 200, 4: 200, 5: 200 };

    // Debug: Log the structure of received data
    console.log('Queue sizes:', queueSizes);
    console.log('Queue capacity:', queueCapacityPerPriority);
    console.log('Request type breakdown:', requestTypeBreakdown);

    // Calculate totals
    const totalQueueSize = Object.values(queueSizes).reduce(
      (sum, size) => sum + size,
      0,
    );
    const totalActiveTasks = Object.values(activeTasks).reduce(
      (sum, count) => sum + count,
      0,
    );
    const throughput =
      metrics.tasksCompleted > 0
        ? (metrics.tasksCompleted / 60).toFixed(2)
        : '0.00';

    // Render overview metrics
    const overviewHtml = `
      <div class="metrics-overview">
        <div class="metric-card">
          <div class="metric-label">Total Queue Size</div>
          <div class="metric-value">${totalQueueSize}</div>
          <div class="metric-subvalue">Items waiting</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active Tasks</div>
          <div class="metric-value">${totalActiveTasks}</div>
          <div class="metric-subvalue">Currently executing</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tasks Started</div>
          <div class="metric-value">${metrics.tasksStarted}</div>
          <div class="metric-subvalue">Total since start</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tasks Completed</div>
          <div class="metric-value">${metrics.tasksCompleted}</div>
          <div class="metric-subvalue">Successfully finished</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tasks Dropped</div>
          <div class="metric-value">${metrics.tasksDropped}</div>
          <div class="metric-subvalue">Failed or rejected</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Throughput</div>
          <div class="metric-value">${throughput}</div>
          <div class="metric-subvalue">Tasks per second</div>
        </div>
      </div>
    `;

    // Render priority sections in priority order (1-5: Immediate, High, Normal, Low, Background)
    const priorityOrder = [1, 2, 3, 4, 5]; // Priority enum values
    const prioritySectionsHtml = priorityOrder
      .map((priority) => {
        const priorityName = PRIORITY_NAMES[priority] || `Priority ${priority}`;
        // Get values for this priority (default to 0 if not present)
        const queueSize = queueSizes[priority] ?? 0;
        const util = utilization[priority] ?? 0;
        const active = activeTasks[priority] ?? 0;
        const processedTypes = requestTypeBreakdown[priority] || {};
        const queuedTypes = queuedRequestTypeBreakdown[priority] || {};
        const activeTypes = activeRequestTypeBreakdown[priority] || {};
        const priorityColor = PRIORITY_COLORS[priority] || '#666';

        // Calculate total processed for this priority (sum of all request type counts)
        const totalProcessed = Object.values(processedTypes).reduce(
          (sum, count) => sum + (typeof count === 'number' ? count : 0),
          0,
        );

        // Get capacity for this priority
        const capacity = queueCapacityPerPriority[priority] ?? 200;

        // Debug log for this priority
        console.log(`Priority ${priority} (${priorityName}):`, {
          queueSize,
          active,
          util,
          capacity,
          totalProcessed,
          processedTypes,
          queuedTypes,
          activeTypes,
        });

        // Determine utilization class
        let utilClass = 'utilization-low';
        if (util >= 75) {
          utilClass = 'utilization-high';
        } else if (util >= 50) {
          utilClass = 'utilization-medium';
        }

        // Build combined request type display: queued/active/complete
        // Get all unique request types across queued, active, and processed
        const allRequestTypes = new Set([
          ...Object.keys(queuedTypes),
          ...Object.keys(activeTypes),
          ...Object.keys(processedTypes),
        ]);

        const requestTypeItems = Array.from(allRequestTypes)
          .map((type) => {
            const queued = queuedTypes[type] || 0;
            const active = activeTypes[type] || 0;
            const processed = processedTypes[type] || 0;
            const total = queued + active + processed;

            // Only show if there's at least one count
            if (total === 0) {
              return '';
            }

            return `
              <div class="request-type-item">
                <span class="request-type-name">${this.escapeHtml(type)}</span>
                <span class="request-type-count">${queued}/${active}/${processed}</span>
              </div>
            `;
          })
          .filter((item) => item !== '')
          .join('');

        const requestTypeHtml =
          requestTypeItems.length > 0
            ? `
            <div class="request-type-section">
              <div class="request-type-title">Request Types (queued/active/complete)</div>
              <div class="request-type-list">
                ${requestTypeItems}
              </div>
            </div>
          `
            : '';

        return `
          <div class="priority-section" data-priority="${priority}">
            <div class="priority-header" data-priority="${priority}">
              <div class="priority-name" style="color: ${priorityColor}">
                ${priorityName}
              </div>
              <div class="priority-stats">
                <div class="priority-stat">
                  <div class="priority-stat-label">Queue Size</div>
                  <div class="priority-stat-value">${queueSize}</div>
                </div>
                <div class="priority-stat">
                  <div class="priority-stat-label">Capacity</div>
                  <div class="priority-stat-value">${capacity}</div>
                </div>
                <div class="priority-stat">
                  <div class="priority-stat-label">Active</div>
                  <div class="priority-stat-value">${active}</div>
                </div>
                <div class="priority-stat">
                  <div class="priority-stat-label">Total Processed</div>
                  <div class="priority-stat-value">${totalProcessed}</div>
                </div>
                <div class="priority-stat">
                  <div class="priority-stat-label">Utilization</div>
                  <div class="priority-stat-value">${util.toFixed(1)}%</div>
                </div>
              </div>
            </div>
            <div class="priority-content ${this.expandedPriorities.has(priority) ? 'expanded' : ''}" 
            style="display: ${this.expandedPriorities.has(priority) ? 'block' : 'none'}"
            id="priority-content-${priority}">
              <div class="utilization-bar">
                <div class="utilization-fill ${utilClass}" style="width: ${util}%"></div>
              </div>
              ${requestTypeHtml}
            </div>
          </div>
        `;
      })
      .join('');

    content.innerHTML = overviewHtml + prioritySectionsHtml;

    // Set up toggle handlers (try to set up if not already done)
    this.setupPriorityToggles();
  }

  private handlePriorityHeaderClick = (event: MouseEvent): void => {
    // Find the closest priority-header element
    const target = event.target as HTMLElement;
    const header = target.closest('.priority-header');
    if (header) {
      event.preventDefault();
      event.stopPropagation();
      const priorityAttr = header.getAttribute('data-priority');
      if (priorityAttr) {
        const priority = parseInt(priorityAttr, 10);
        // Toggle the expanded state in our Set
        if (this.expandedPriorities.has(priority)) {
          this.expandedPriorities.delete(priority);
        } else {
          this.expandedPriorities.add(priority);
        }
        // Update the DOM element if it exists
        const content = document.getElementById(`priority-content-${priority}`);
        if (content) {
          const isExpanded = this.expandedPriorities.has(priority);
          content.classList.toggle('expanded');
          // Update inline style to match expanded state (inline style takes precedence)
          content.style.display = isExpanded ? 'block' : 'none';
          console.log(
            `Toggled priority ${priority}: ${isExpanded ? 'expanded' : 'collapsed'}`,
          );
        } else {
          console.warn(`Could not find priority-content-${priority}`);
        }
      } else {
        console.warn('Priority header found but no data-priority attribute');
      }
    }
  };

  private setupPriorityToggles(): void {
    // Only set up once to avoid duplicate event listeners
    if (this.priorityTogglesSetup) {
      return;
    }

    // Use event delegation to handle clicks on priority headers
    // Try to find the element - it should exist by the time render() is called
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
      dashboardContent.addEventListener(
        'click',
        this.handlePriorityHeaderClick,
      );
      this.priorityTogglesSetup = true;
      console.log(
        'Priority toggle event listener attached to dashboard-content',
      );
    } else {
      console.warn(
        'dashboard-content element not found, will retry on next render',
      );
      // Don't set the flag, so we can retry on next render
    }
  }

  private updateLastUpdateTime(): void {
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate && this.currentData) {
      const timestamp = this.currentData.metadata.timestamp;
      const date = new Date(timestamp);
      const timeStr = date.toLocaleTimeString();
      lastUpdate.textContent = `Last updated: ${timeStr}`;
    }
  }

  private showError(message: string): void {
    const content = document.getElementById('dashboard-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div>${this.escapeHtml(message)}</div>
        </div>
      `;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard when page loads
function initDashboard() {
  console.log('Initializing queue state dashboard...');
  console.log('Initial data:', initialData);
  try {
    new QueueStateDashboard();
    console.log('Queue state dashboard initialized');
  } catch (error) {
    console.error('Failed to initialize queue state dashboard:', error);
    const content = document.getElementById('dashboard-content');
    if (content) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div>Failed to initialize dashboard: ${error}</div>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
