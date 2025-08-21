/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

declare interface DedicatedWorkerGlobalScope extends WorkerGlobalScope {
  postMessage(message: any, transfer?: Transferable[]): void;
  onmessage:
    | ((this: DedicatedWorkerGlobalScope, ev: MessageEvent) => any)
    | null;
  onerror: ((this: DedicatedWorkerGlobalScope, ev: ErrorEvent) => any) | null;
}

declare interface WorkerGlobalScope {
  self: DedicatedWorkerGlobalScope;
  importScripts(...urls: string[]): void;
  location: WorkerLocation;
  navigator: WorkerNavigator;
  onerror: ((this: WorkerGlobalScope, ev: ErrorEvent) => any) | null;
  onlanguagechange: ((this: WorkerGlobalScope, ev: Event) => any) | null;
  onoffline: ((this: WorkerGlobalScope, ev: Event) => any) | null;
  ononline: ((this: WorkerGlobalScope, ev: Event) => any) | null;
  onrejectionhandled:
    | ((this: WorkerGlobalScope, ev: PromiseRejectionEvent) => any)
    | null;
  onunhandledrejection:
    | ((this: WorkerGlobalScope, ev: PromiseRejectionEvent) => any)
    | null;
  close(): void;
}

declare interface WorkerLocation {
  readonly hash: string;
  readonly host: string;
  readonly hostname: string;
  readonly href: string;
  readonly origin: string;
  readonly pathname: string;
  readonly port: string;
  readonly protocol: string;
  readonly search: string;
  toString(): string;
}

declare interface WorkerNavigator {
  readonly hardwareConcurrency: number;
  readonly language: string;
  readonly languages: readonly string[];
  readonly onLine: boolean;
  readonly userAgent: string;
}
