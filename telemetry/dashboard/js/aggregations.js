/**
 * Aggregation utilities for telemetry data.
 */

/**
 * Filter spans by time range.
 *
 * @param {Object[]} spans - Array of span objects
 * @param {string} timeRange - Time range identifier (1h, 6h, 24h, 7d)
 * @returns {Object[]} Filtered spans
 */
export function filterByTimeRange(spans, timeRange) {
    const now = Date.now();
    let cutoff;

    switch (timeRange) {
        case '1h':
            cutoff = now - 60 * 60 * 1000;
            break;
        case '6h':
            cutoff = now - 6 * 60 * 60 * 1000;
            break;
        case '24h':
            cutoff = now - 24 * 60 * 60 * 1000;
            break;
        case '7d':
            cutoff = now - 7 * 24 * 60 * 60 * 1000;
            break;
        default:
            cutoff = now - 24 * 60 * 60 * 1000;
    }

    return spans.filter(span => {
        const timestamp = getTimestampMs(span);
        return timestamp >= cutoff;
    });
}

/**
 * Get timestamp in milliseconds from a span.
 *
 * @param {Object} span - Span object
 * @returns {number} Timestamp in milliseconds
 */
function getTimestampMs(span) {
    if (span.startTimeUnixNano) {
        return span.startTimeUnixNano / 1_000_000;
    }
    if (Array.isArray(span.startTime)) {
        return span.startTime[0] * 1000 + span.startTime[1] / 1_000_000;
    }
    return 0;
}

/**
 * Get all durations from spans in milliseconds.
 *
 * @param {Object[]} spans - Array of span objects
 * @returns {number[]} Array of durations in ms
 */
export function getAllDurations(spans) {
    return spans
        .map(span => getDurationMs(span))
        .filter(d => d > 0);
}

/**
 * Get duration in milliseconds from a span.
 *
 * @param {Object} span - Span object
 * @returns {number} Duration in milliseconds
 */
function getDurationMs(span) {
    if (typeof span.duration === 'number') {
        return span.duration / 1_000_000;
    }
    if (Array.isArray(span.duration)) {
        return span.duration[0] * 1000 + span.duration[1] / 1_000_000;
    }
    if (span.endTimeUnixNano && span.startTimeUnixNano) {
        return (span.endTimeUnixNano - span.startTimeUnixNano) / 1_000_000;
    }
    return 0;
}

/**
 * Calculate overall percentiles from durations.
 *
 * @param {number[]} durations - Array of durations
 * @returns {Object} Percentile values { p50, p90, p99 }
 */
export function calculatePercentiles(durations) {
    if (durations.length === 0) {
        return { p50: 0, p90: 0, p99: 0 };
    }

    const sorted = [...durations].sort((a, b) => a - b);

    return {
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p99: percentile(sorted, 99),
    };
}

/**
 * Calculate percentile from a sorted array.
 *
 * @param {number[]} sortedValues - Sorted array of numbers
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value
 */
function percentile(sortedValues, p) {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
        return sortedValues[lower];
    }

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Filter spans by status (ok or error).
 *
 * @param {Object[]} spans - Array of span objects
 * @param {string} statusFilter - Status filter (all, ok, error)
 * @returns {Object[]} Filtered spans
 */
export function filterByStatus(spans, statusFilter) {
    switch (statusFilter) {
        case 'ok':
            return spans.filter(s => s.status?.code !== 2);
        case 'error':
            return spans.filter(s => s.status?.code === 2);
        default:
            return spans;
    }
}

/**
 * Filter spans by name pattern.
 *
 * @param {Object[]} spans - Array of span objects
 * @param {string} pattern - Name pattern to match
 * @returns {Object[]} Filtered spans
 */
export function filterByName(spans, pattern) {
    if (!pattern) return spans;

    const lowerPattern = pattern.toLowerCase();
    return spans.filter(s =>
        (s.name || '').toLowerCase().includes(lowerPattern)
    );
}
