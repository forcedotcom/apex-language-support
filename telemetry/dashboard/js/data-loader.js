/**
 * Data loader module for the telemetry dashboard.
 * Handles loading OTLP-formatted trace data from the OTEL Collector JSON file
 * and flattening it into simple span objects for the dashboard.
 */

const TRACE_DATA_PATHS = [
    '../data/traces.json',
    '/data/traces.json',
    '../../data/traces.json',
];

/**
 * Load trace data from the traces.json file.
 * The OTEL Collector writes NDJSON in OTLP format (resourceSpans).
 *
 * @returns {Promise<Object[]>} Array of flattened span objects
 */
export async function loadTraceData() {
    for (const path of TRACE_DATA_PATHS) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                const text = await response.text();
                return parseOTLPTraces(text);
            }
        } catch (_) {
            // Try next path
        }
    }
    console.warn('No trace data found. Enable localTracingEnabled and start the OTEL Collector.');
    return [];
}

/**
 * Parse OTLP-formatted NDJSON trace data.
 * Each line may be a full OTLP export batch with nested resourceSpans.
 *
 * @param {string} text - Raw NDJSON text from the collector
 * @returns {Object[]} Array of flattened span objects
 */
function parseOTLPTraces(text) {
    const spans = [];

    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines) {
        let parsed;
        try {
            parsed = JSON.parse(line);
        } catch (_) {
            continue;
        }

        if (parsed.resourceSpans) {
            spans.push(...extractSpansFromOTLP(parsed));
        } else if (parsed.name && (parsed.traceId || parsed.spanId)) {
            spans.push(parsed);
        }
    }

    return deduplicateSpans(spans);
}

/**
 * Extract and flatten spans from the nested OTLP resourceSpans format.
 *
 * OTLP structure:
 *   { resourceSpans: [{ resource: { attributes: [...] }, scopeSpans: [{ spans: [...] }] }] }
 *
 * Attributes come as arrays: [{ key: "k", value: { stringValue: "v" } }]
 * We flatten them to: { "k": "v" }
 *
 * @param {Object} otlpBatch - A parsed OTLP export batch
 * @returns {Object[]} Flattened span objects
 */
function extractSpansFromOTLP(otlpBatch) {
    const result = [];

    for (const resourceSpan of otlpBatch.resourceSpans || []) {
        const resourceAttrs = flattenAttributes(resourceSpan.resource?.attributes);

        for (const scopeSpan of resourceSpan.scopeSpans || []) {
            for (const span of scopeSpan.spans || []) {
                const spanAttrs = flattenAttributes(span.attributes);

                result.push({
                    traceId: span.traceId,
                    spanId: span.spanId,
                    parentSpanId: span.parentSpanId || undefined,
                    name: span.name,
                    kind: span.kind,
                    startTimeUnixNano: parseNano(span.startTimeUnixNano),
                    endTimeUnixNano: parseNano(span.endTimeUnixNano),
                    status: normalizeStatus(span.status),
                    attributes: spanAttrs,
                    resource: { attributes: resourceAttrs },
                });
            }
        }
    }

    return result;
}

/**
 * Convert OTLP attribute arrays into flat key-value objects.
 *
 * Input:  [{ key: "service.platform", value: { stringValue: "desktop" } }]
 * Output: { "service.platform": "desktop" }
 *
 * @param {Array|Object} attrs - OTLP attributes array or already-flat object
 * @returns {Object} Flat key-value attributes
 */
function flattenAttributes(attrs) {
    if (!attrs) return {};
    if (!Array.isArray(attrs)) return attrs;

    const result = {};
    for (const attr of attrs) {
        if (!attr.key || !attr.value) continue;
        const v = attr.value;
        result[attr.key] =
            v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue ?? JSON.stringify(v);
    }
    return result;
}

/**
 * Parse nanosecond timestamps that may be strings or numbers.
 */
function parseNano(value) {
    if (typeof value === 'string') return parseInt(value, 10);
    return value || 0;
}

/**
 * Normalize span status from OTLP format.
 * OTLP uses code 0 = UNSET, 1 = OK, 2 = ERROR.
 */
function normalizeStatus(status) {
    if (!status) return { code: 0 };
    return { code: status.code || 0, message: status.message };
}

/**
 * Remove duplicate spans (the collector sometimes writes the same span twice).
 */
function deduplicateSpans(spans) {
    const seen = new Set();
    return spans.filter(span => {
        const key = `${span.traceId}-${span.spanId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Aggregate spans by environment (web vs desktop).
 *
 * @param {Object[]} spans - Array of flattened span objects
 * @returns {Object} Aggregated metrics by environment
 */
export function aggregateByEnvironment(spans) {
    const web = spans.filter(s =>
        s.resource?.attributes?.['service.platform'] === 'web'
    );
    const desktop = spans.filter(s =>
        s.resource?.attributes?.['service.platform'] === 'desktop' ||
        s.resource?.attributes?.['service.platform'] === undefined
    );

    return {
        web: computeMetrics(web),
        desktop: computeMetrics(desktop),
    };
}

/**
 * Compute metrics for a set of spans.
 */
function computeMetrics(spans) {
    if (spans.length === 0) {
        return { count: 0, errors: 0, avgDuration: 0, p50: 0, p90: 0, p99: 0 };
    }

    const durations = spans.map(s => getDurationMs(s)).filter(d => d > 0);
    const errors = spans.filter(s => s.status?.code === 2).length;

    return {
        count: spans.length,
        errors,
        avgDuration: durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0,
        p50: percentile(durations, 50),
        p90: percentile(durations, 90),
        p99: percentile(durations, 99),
    };
}

/**
 * Get duration in milliseconds from a span.
 */
function getDurationMs(span) {
    if (typeof span.duration === 'number') {
        return span.duration / 1_000_000;
    }
    if (span.endTimeUnixNano && span.startTimeUnixNano) {
        return (span.endTimeUnixNano - span.startTimeUnixNano) / 1_000_000;
    }
    return 0;
}

/**
 * Calculate percentile of an array.
 */
function percentile(values, p) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Aggregate spans by operation type.
 */
export function aggregateByOperation(spans) {
    const operations = {};
    spans.forEach(span => {
        const name = span.name || 'unknown';
        const env = span.resource?.attributes?.['service.platform'] || 'desktop';
        if (!operations[name]) {
            operations[name] = { desktop: 0, web: 0 };
        }
        operations[name][env === 'web' ? 'web' : 'desktop']++;
    });
    return operations;
}

/**
 * Group spans by time bucket for error rate timeline.
 */
export function groupByTimeBucket(spans, bucketSizeMs = 60000) {
    if (spans.length === 0) return [];
    const buckets = {};
    spans.forEach(span => {
        const timestamp = getTimestampMs(span);
        if (!timestamp) return;
        const bucket = Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
        if (!buckets[bucket]) {
            buckets[bucket] = { total: 0, errors: 0 };
        }
        buckets[bucket].total++;
        if (span.status?.code === 2) {
            buckets[bucket].errors++;
        }
    });
    return Object.entries(buckets)
        .map(([timestamp, data]) => ({
            timestamp: parseInt(timestamp, 10),
            total: data.total,
            errors: data.errors,
            errorRate: data.total > 0 ? (data.errors / data.total) * 100 : 0,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get timestamp in milliseconds from a span.
 */
function getTimestampMs(span) {
    if (span.startTimeUnixNano) {
        return span.startTimeUnixNano / 1_000_000;
    }
    return 0;
}

/**
 * Format spans for the table display.
 */
export function formatSpansForTable(spans) {
    return spans.map(span => ({
        timestamp: new Date(getTimestampMs(span)).toISOString(),
        name: span.name || 'unknown',
        duration: getDurationMs(span).toFixed(2),
        status: span.status?.code === 2 ? 'ERROR' : 'OK',
        environment: span.resource?.attributes?.['service.platform'] || 'desktop',
        traceId: span.traceId || '--',
    }));
}
