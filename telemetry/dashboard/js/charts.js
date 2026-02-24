/**
 * Chart configuration and utilities for the telemetry dashboard.
 */

// Chart.js default configuration for dark theme
Chart.defaults.color = '#cccccc';
Chart.defaults.borderColor = '#3c3c3c';

/**
 * Create the operation breakdown chart.
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Chart} Chart instance
 */
export function createOperationChart(canvas) {
    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Desktop',
                    data: [],
                    backgroundColor: 'rgba(78, 201, 176, 0.8)',
                    borderColor: '#4ec9b0',
                    borderWidth: 1,
                },
                {
                    label: 'Web',
                    data: [],
                    backgroundColor: 'rgba(197, 134, 192, 0.8)',
                    borderColor: '#c586c0',
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false,
                    },
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                },
            },
        },
    });
}

/**
 * Update the operation chart with new data.
 *
 * @param {Chart} chart - Chart instance
 * @param {Object} operationData - Operation counts by type
 */
export function updateOperationChart(chart, operationData) {
    const labels = Object.keys(operationData).sort();
    const desktopData = labels.map(op => operationData[op]?.desktop || 0);
    const webData = labels.map(op => operationData[op]?.web || 0);

    chart.data.labels = labels;
    chart.data.datasets[0].data = desktopData;
    chart.data.datasets[1].data = webData;
    chart.update();
}

/**
 * Create the latency distribution chart.
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Chart} Chart instance
 */
export function createLatencyChart(canvas) {
    return new Chart(canvas, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Count',
                    data: [],
                    backgroundColor: 'rgba(0, 122, 204, 0.8)',
                    borderColor: '#007acc',
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            if (items.length > 0) {
                                return `${items[0].label} ms`;
                            }
                            return '';
                        },
                    },
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Duration (ms)',
                    },
                    grid: {
                        display: false,
                    },
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count',
                    },
                },
            },
        },
    });
}

/**
 * Update the latency chart with histogram data.
 *
 * @param {Chart} chart - Chart instance
 * @param {number[]} durations - Array of durations in ms
 */
export function updateLatencyChart(chart, durations) {
    if (durations.length === 0) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
    }

    // Create histogram bins
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(durations.length)));
    const binSize = (max - min) / binCount || 1;

    const bins = new Array(binCount).fill(0);
    const labels = [];

    for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        labels.push(`${binStart.toFixed(0)}-${binEnd.toFixed(0)}`);
    }

    durations.forEach(d => {
        const binIndex = Math.min(
            Math.floor((d - min) / binSize),
            binCount - 1
        );
        bins[binIndex]++;
    });

    chart.data.labels = labels;
    chart.data.datasets[0].data = bins;
    chart.update();
}

/**
 * Create the error rate timeline chart.
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {Chart} Chart instance
 */
export function createErrorChart(canvas) {
    return new Chart(canvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Error Rate (%)',
                    data: [],
                    borderColor: '#f14c4c',
                    backgroundColor: 'rgba(241, 76, 76, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                annotation: {
                    annotations: {
                        threshold: {
                            type: 'line',
                            yMin: 5,
                            yMax: 5,
                            borderColor: '#ce9178',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: '5% Threshold',
                                position: 'end',
                            },
                        },
                    },
                },
            },
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Time',
                    },
                    grid: {
                        display: false,
                    },
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Error Rate (%)',
                    },
                },
            },
        },
    });
}

/**
 * Update the error chart with timeline data.
 *
 * @param {Chart} chart - Chart instance
 * @param {Object[]} timelineData - Array of { timestamp, errorRate }
 */
export function updateErrorChart(chart, timelineData) {
    if (timelineData.length === 0) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
    }

    const labels = timelineData.map(d =>
        new Date(d.timestamp).toLocaleTimeString()
    );
    const data = timelineData.map(d => d.errorRate);

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}
