/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Declare global types for browser environment
declare global {
  // Declare Worker type for browser environment
  interface Worker {
    postMessage(message: any, transfer?: Transferable[]): void;
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
    onerror: ((this: Worker, ev: ErrorEvent) => any) | null;
    addEventListener<K extends keyof WorkerEventMap>(
      type: K,
      listener: (this: Worker, ev: WorkerEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof WorkerEventMap>(
      type: K,
      listener: (this: Worker, ev: WorkerEventMap[K]) => any,
      options?: boolean | EventListenerOptions,
    ): void;
  }

  // Declare WorkerEventMap for browser environment
  interface WorkerEventMap {
    message: MessageEvent;
    error: ErrorEvent;
  }

  // Declare MessageEvent for browser environment
  interface MessageEvent {
    readonly data: any;
    readonly origin: string;
    readonly lastEventId: string;
    readonly source: MessageEventSource | null;
    readonly ports: readonly MessagePort[];
  }

  // Declare ErrorEvent for browser environment
  interface ErrorEvent extends Event {
    readonly message: string;
    readonly filename: string;
    readonly lineno: number;
    readonly colno: number;
    readonly error: any;
  }

  // Declare MessagePort for browser environment
  interface MessagePort {
    postMessage(message: any, transfer?: Transferable[]): void;
    start(): void;
    close(): void;
    onmessage: ((this: MessagePort, ev: MessageEvent) => any) | null;
    onmessageerror: ((this: MessagePort, ev: MessageEvent) => any) | null;
  }

  // Declare MessageEventSource for browser environment
  type MessageEventSource = Window | MessagePort | ServiceWorker;

  // Declare ServiceWorker for browser environment
  interface ServiceWorker extends EventTarget {
    readonly scriptURL: string;
    readonly state: ServiceWorkerState;
    postMessage(message: any, transfer?: Transferable[]): void;
    onstatechange: ((this: ServiceWorker, ev: Event) => any) | null;
  }

  // Declare ServiceWorkerState for browser environment
  type ServiceWorkerState =
    | 'installing'
    | 'installed'
    | 'activating'
    | 'activated'
    | 'redundant';
}
