/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * HTTP service that accepts OTLP/JSON span data from worker threads
 * and routes them through the extension's existing OTEL exporters.
 *
 * Desktop-only: no-op in web extension (no node:http, no worker_threads).
 */

import * as vscode from 'vscode';
import { formattedError } from '@salesforce/apex-lsp-shared';
import { logToOutputChannel } from '../logging';
import type {
  Server as HttpServer,
  IncomingMessage,
  ServerResponse,
} from 'http';
import { SdkSpanReplay, type SdkSpanRuntimeFactory } from './sdkSpanReplay';

let collectorPort: number | undefined;
let httpServer: HttpServer | undefined;
let sdkSpanReplay: SdkSpanReplay | undefined;

/**
 * Start the span collector HTTP service (desktop only).
 * Returns the ephemeral port number, or undefined if not started.
 *
 * @param runtimeFactory Creates a Salesforce SDK runtime for each service
 * represented by incoming OTLP resource spans.
 */
export async function startSpanCollector(
  runtimeFactory: SdkSpanRuntimeFactory,
): Promise<number | undefined> {
  // No-op in web extension
  if (vscode.env.uiKind === vscode.UIKind.Web) {
    logToOutputChannel('Span collector skipped (web extension)', 'debug');
    return undefined;
  }

  if (httpServer) {
    logToOutputChannel('Span collector already running', 'debug');
    return collectorPort;
  }

  sdkSpanReplay = new SdkSpanReplay(runtimeFactory, (message) =>
    logToOutputChannel(`[spanCollector] ${message}`, 'debug'),
  );

  logToOutputChannel(
    '[spanCollector] Starting collector for Salesforce SDK span export',
    'info',
  );

  try {
    // Dynamic import to avoid bundling Node.js modules in browser build
    const http = await import('http');

    return new Promise<number | undefined>((resolve) => {
      httpServer = http.createServer(handleRequest);

      httpServer.on('error', (error) => {
        logToOutputChannel(
          `Span collector server error: ${formattedError(error)}`,
          'warning',
        );
        void sdkSpanReplay?.shutdown();
        sdkSpanReplay = undefined;
        httpServer = undefined;
        collectorPort = undefined;
        resolve(undefined);
      });

      // Bind to port 0 (OS-assigned ephemeral port)
      httpServer.listen(0, '127.0.0.1', () => {
        const address = httpServer?.address();
        if (address && typeof address === 'object') {
          collectorPort = address.port;
          logToOutputChannel(
            `Span collector started on http://127.0.0.1:${collectorPort}`,
            'info',
          );
          resolve(collectorPort);
        } else {
          logToOutputChannel(
            'Span collector failed to get bound port',
            'warning',
          );
          httpServer?.close();
          httpServer = undefined;
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    logToOutputChannel(
      `Failed to start span collector: ${formattedError(error)}`,
      'warning',
    );
    return undefined;
  }
}

/**
 * Handle incoming HTTP requests (POST /v1/traces).
 */
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  logToOutputChannel(
    `[spanCollector] Received ${req.method} ${req.url} from ${req.socket.remoteAddress}`,
    'debug',
  );

  if (req.method !== 'POST' || req.url !== '/v1/traces') {
    res.writeHead(404);
    res.end();
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', async () => {
    try {
      const body = Buffer.concat(chunks).toString('utf-8');
      const json = JSON.parse(body) as Record<string, unknown>;
      logToOutputChannel(
        `[spanCollector] Processing ${body.length} byte trace export`,
        'debug',
      );
      const spanCount = await processTraceExport(json);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('');
      logToOutputChannel(
        `[spanCollector] Accepted ${spanCount} spans for SDK export`,
        'debug',
      );
    } catch (error) {
      logToOutputChannel(
        `Error processing trace request: ${formattedError(error)}`,
        'warning',
      );
      res.writeHead(500);
      res.end();
    }
  });

  req.on('error', (error) => {
    logToOutputChannel(
      `Error reading trace request: ${formattedError(error)}`,
      'warning',
    );
    res.writeHead(500);
    res.end();
  });
}

/**
 * Stop the span collector HTTP service.
 */
export async function stopSpanCollector(): Promise<void> {
  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer?.close((error) => {
        if (error) {
          logToOutputChannel(
            `Error stopping span collector: ${formattedError(error)}`,
            'warning',
          );
        } else {
          logToOutputChannel('Span collector stopped', 'info');
        }
        httpServer = undefined;
        collectorPort = undefined;
        resolve();
      });
    });
  }

  try {
    await sdkSpanReplay?.shutdown();
  } catch (error) {
    logToOutputChannel(
      `Error flushing SDK span replay: ${formattedError(error)}`,
      'warning',
    );
  }
  sdkSpanReplay = undefined;
}

/**
 * Get the current collector port (undefined if not running).
 */
export function getCollectorPort(): number | undefined {
  return collectorPort;
}

/**
 * Process an OTLP/JSON ExportTraceServiceRequest through the Salesforce SDK.
 * SdkSpanReplay buffers and remaps the trace so SDK-generated span IDs retain
 * the original distributed hierarchy while gaining every configured SDK sink.
 */
async function processTraceExport(
  body: Record<string, unknown>,
): Promise<number> {
  if (!sdkSpanReplay) {
    throw new Error('Salesforce SDK span replay is not initialized');
  }
  return sdkSpanReplay.ingest(body);
}
