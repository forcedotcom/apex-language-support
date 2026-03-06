/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Mock for @azure/monitor-opentelemetry-exporter
 * Used in browser/web Jest tests to avoid ESM import issues
 */
module.exports = {
  AzureMonitorTraceExporter: class AzureMonitorTraceExporter {
    constructor() {}
    export() {}
    shutdown() { return Promise.resolve(); }
  },
};
