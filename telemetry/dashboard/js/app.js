/**
 * Main application for the telemetry dashboard.
 */

import {
    loadTraceData,
    aggregateByEnvironment,
    aggregateByOperation,
    groupByTimeBucket,
    formatSpansForTable,
} from './data-loader.js';

import {
    createOperationChart,
    updateOperationChart,
    createLatencyChart,
    updateLatencyChart,
    createErrorChart,
    updateErrorChart,
} from './charts.js';

import {
    filterByTimeRange,
    getAllDurations,
    calculatePercentiles,
    filterByStatus,
    filterByName,
} from './aggregations.js';

// State
let allSpans = [];
let filteredSpans = [];
let operationChart = null;
let latencyChart = null;
let errorChart = null;

// DOM Elements
const elements = {
    // Environment comparison
    desktopTotal: document.getElementById('desktop-total'),
    desktopErrors: document.getElementById('desktop-errors'),
    desktopLatency: document.getElementById('desktop-latency'),
    webTotal: document.getElementById('web-total'),
    webErrors: document.getElementById('web-errors'),
    webLatency: document.getElementById('web-latency'),

    // Percentiles
    p50: document.getElementById('p50'),
    p90: document.getElementById('p90'),
    p99: document.getElementById('p99'),

    // Controls
    refreshBtn: document.getElementById('refreshBtn'),
    generateDemoBtn: document.getElementById('generateDemoBtn'),
    timeRange: document.getElementById('timeRange'),
    filterInput: document.getElementById('filterInput'),
    statusFilter: document.getElementById('statusFilter'),

    // Table
    spansTableBody: document.getElementById('spansTableBody'),

    // Footer
    lastRefresh: document.getElementById('lastRefresh'),
};

/**
 * Initialize the dashboard.
 */
async function init() {
    // Create charts
    operationChart = createOperationChart(
        document.getElementById('operationChart')
    );
    latencyChart = createLatencyChart(
        document.getElementById('latencyChart')
    );
    errorChart = createErrorChart(
        document.getElementById('errorChart')
    );

    // Set up event listeners
    elements.refreshBtn.addEventListener('click', refreshData);
    elements.generateDemoBtn.addEventListener('click', generateDemoData);
    elements.timeRange.addEventListener('change', applyFilters);
    elements.filterInput.addEventListener('input', debounce(applyFilters, 300));
    elements.statusFilter.addEventListener('change', applyFilters);

    // Initial data load
    await refreshData();
}

/**
 * Refresh data from the server.
 */
async function refreshData() {
    try {
        allSpans = await loadTraceData();
        applyFilters();
        elements.lastRefresh.textContent = new Date().toLocaleString();
    } catch (error) {
        console.error('Failed to refresh data:', error);
    }
}

/**
 * Apply all filters and update the display.
 */
function applyFilters() {
    const timeRange = elements.timeRange.value;
    const nameFilter = elements.filterInput.value;
    const statusFilter = elements.statusFilter.value;

    // Apply filters
    filteredSpans = filterByTimeRange(allSpans, timeRange);
    filteredSpans = filterByName(filteredSpans, nameFilter);
    filteredSpans = filterByStatus(filteredSpans, statusFilter);

    // Update all displays
    updateEnvironmentComparison();
    updateCharts();
    updateTable();
}

/**
 * Update the environment comparison cards.
 */
function updateEnvironmentComparison() {
    const metrics = aggregateByEnvironment(filteredSpans);

    // Desktop
    elements.desktopTotal.textContent = metrics.desktop.count.toLocaleString();
    elements.desktopErrors.textContent = metrics.desktop.errors.toLocaleString();
    elements.desktopLatency.textContent = `${metrics.desktop.avgDuration.toFixed(1)} ms`;

    // Web
    elements.webTotal.textContent = metrics.web.count.toLocaleString();
    elements.webErrors.textContent = metrics.web.errors.toLocaleString();
    elements.webLatency.textContent = `${metrics.web.avgDuration.toFixed(1)} ms`;

    // Overall percentiles
    const durations = getAllDurations(filteredSpans);
    const percentiles = calculatePercentiles(durations);

    elements.p50.textContent = `${percentiles.p50.toFixed(1)} ms`;
    elements.p90.textContent = `${percentiles.p90.toFixed(1)} ms`;
    elements.p99.textContent = `${percentiles.p99.toFixed(1)} ms`;
}

/**
 * Update all charts.
 */
function updateCharts() {
    // Operation breakdown
    const operationData = aggregateByOperation(filteredSpans);
    updateOperationChart(operationChart, operationData);

    // Latency distribution
    const durations = getAllDurations(filteredSpans);
    updateLatencyChart(latencyChart, durations);

    // Error rate timeline
    const timelineData = groupByTimeBucket(filteredSpans);
    updateErrorChart(errorChart, timelineData);
}

/**
 * Update the spans table.
 */
function updateTable() {
    const tableData = formatSpansForTable(filteredSpans)
        .slice(0, 100) // Limit to 100 rows
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    elements.spansTableBody.innerHTML = tableData
        .map(span => `
            <tr>
                <td>${new Date(span.timestamp).toLocaleString()}</td>
                <td>${escapeHtml(span.name)}</td>
                <td>${span.duration}</td>
                <td class="${span.status === 'OK' ? 'status-ok' : 'status-error'}">${span.status}</td>
                <td class="${span.environment === 'web' ? 'env-web' : 'env-desktop'}">${span.environment}</td>
                <td class="trace-id">${span.traceId.slice(0, 16)}...</td>
            </tr>
        `)
        .join('');
}

/**
 * Generate demo data for testing the dashboard.
 */
async function generateDemoData() {
    const OPERATIONS = [
        'lsp.hover',
        'lsp.completion',
        'lsp.definition',
        'lsp.references',
        'lsp.documentSymbol',
        'lsp.diagnostics',
        'apex.parse',
        'apex.resolveSymbols',
    ];

    const spans = [];
    const now = Date.now();
    const count = 500;

    for (let i = 0; i < count; i++) {
        const environment = Math.random() > 0.4 ? 'desktop' : 'web';
        const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
        const isError = Math.random() < 0.05;

        // Web operations typically slower
        const baseDuration = environment === 'web' ? 50 : 30;
        const duration = baseDuration + Math.random() * 200;

        const timestamp = now - (count - i) * 1000 * 60; // Spread over time

        spans.push({
            traceId: generateTraceId(),
            spanId: generateSpanId(),
            name: operation,
            startTimeUnixNano: timestamp * 1_000_000,
            endTimeUnixNano: (timestamp + duration) * 1_000_000,
            duration: duration * 1_000_000,
            status: isError ? { code: 2, message: 'Operation failed' } : { code: 0 },
            resource: {
                attributes: {
                    'extension.name': 'apex-language-server',
                    'extension.version': '1.0.0',
                    'service.platform': environment,
                },
            },
            attributes: {
                'lsp.method': operation.replace('lsp.', 'textDocument/'),
            },
        });
    }

    allSpans = spans;
    applyFilters();
    elements.lastRefresh.textContent = `${new Date().toLocaleString()} (demo data)`;
    console.log(`Generated ${count} demo spans`);
}

/**
 * Generate a random trace ID.
 */
function generateTraceId() {
    return Array.from(
        { length: 32 },
        () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

/**
 * Generate a random span ID.
 */
function generateSpanId() {
    return Array.from(
        { length: 16 },
        () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function calls.
 */
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// Initialize on load
init();
