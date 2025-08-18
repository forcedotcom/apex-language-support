/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal events polyfill for web worker environments
 * This provides the core EventEmitter functionality needed by the language server
 */

type Listener = (...args: any[]) => void;

class EventEmitterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventEmitterError';
  }
}

class MaxListenersExceededError extends EventEmitterError {
  constructor(
    eventName: string | symbol,
    currentCount: number,
    maxListeners: number,
  ) {
    super(
      `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${currentCount} ${String(
        eventName,
      )} listeners added (max ${maxListeners}). Use emitter.setMaxListeners() to increase limit`,
    );
    this.name = 'MaxListenersExceededError';
  }
}

class InvalidEventError extends EventEmitterError {
  constructor(eventName: string | symbol) {
    super(`Invalid event: ${String(eventName)}`);
    this.name = 'InvalidEventError';
  }
}

class ListenerError extends EventEmitterError {
  constructor(
    message: string,
    public readonly error: Error,
  ) {
    super(
      `Error in event listener: ${message}\nOriginal error: ${error.message}`,
    );
    this.name = 'ListenerError';
  }
}

interface ListenerMetadata {
  listener: Listener;
  timestamp: number;
  count: number;
}

export class EventEmitter {
  private maxListeners: number = 10;
  private events: Map<string | symbol, ListenerMetadata[]> = new Map();
  private cleanupInterval: number | undefined;
  private readonly DEFAULT_CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly DEFAULT_LISTENER_TIMEOUT = 300000; // 5 minutes
  private readonly DEFAULT_MAX_INVOCATIONS = 1000;

  addListener(eventName: string | symbol, listener: Listener): this {
    return this.on(eventName, listener);
  }

  private startCleanupInterval(): void {
    if (this.cleanupInterval === undefined) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupStaleListeners();
      }, this.DEFAULT_CLEANUP_INTERVAL) as unknown as number;
    }
  }

  private stopCleanupInterval(): void {
    if (this.cleanupInterval !== undefined) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private cleanupStaleListeners(): void {
    const now = Date.now();
    for (const [eventName, listeners] of this.events.entries()) {
      const activeListeners = listeners.filter(
        (metadata) =>
          now - metadata.timestamp < this.DEFAULT_LISTENER_TIMEOUT &&
          metadata.count < this.DEFAULT_MAX_INVOCATIONS,
      );

      if (activeListeners.length === 0) {
        this.events.delete(eventName);
      } else if (activeListeners.length < listeners.length) {
        this.events.set(eventName, activeListeners);
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `Removed ${
              listeners.length - activeListeners.length
            } stale listeners for event '${String(eventName)}'`,
          );
        }
      }
    }

    // Stop cleanup if no more events
    if (this.events.size === 0) {
      this.stopCleanupInterval();
    }
  }

  on(eventName: string | symbol, listener: Listener): this {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listeners = this.events.get(eventName)!;
    if (listeners.length >= this.maxListeners && this.maxListeners !== 0) {
      const error = new MaxListenersExceededError(
        eventName,
        listeners.length,
        this.maxListeners,
      );
      if (process.env.NODE_ENV !== 'production') {
        console.warn(error.message);
      }
      this.emit('error', error);
    }

    listeners.push({
      listener,
      timestamp: Date.now(),
      count: 0,
    });

    this.startCleanupInterval();
    return this;
  }

  once(eventName: string | symbol, listener: Listener): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(eventName, onceWrapper);
      listener.apply(this, args);
    };
    return this.on(eventName, onceWrapper);
  }

  removeListener(eventName: string | symbol, listener: Listener): this {
    const listeners = this.events.get(eventName);
    if (listeners) {
      const index = listeners.findIndex((meta) => meta.listener === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.events.delete(eventName);
          if (this.events.size === 0) {
            this.stopCleanupInterval();
          }
        }
      }
    }
    return this;
  }

  off(eventName: string | symbol, listener: Listener): this {
    return this.removeListener(eventName, listener);
  }

  removeAllListeners(eventName?: string | symbol): this {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
    return this;
  }

  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }

  getMaxListeners(): number {
    return this.maxListeners;
  }

  listeners(eventName: string | symbol): Listener[] {
    return [...(this.events.get(eventName) || [])].map((meta) => meta.listener);
  }

  rawListeners(eventName: string | symbol): Listener[] {
    return this.listeners(eventName);
  }

  // Clean up resources when instance is destroyed
  destroy(): void {
    this.stopCleanupInterval();
    this.events.clear();
  }

  emit(eventName: string | symbol, ...args: any[]): boolean {
    const listeners = this.events.get(eventName);
    if (!listeners || listeners.length === 0) {
      if (eventName !== 'error') {
        const error = new InvalidEventError(eventName);
        this.emit('error', error);
      }
      return false;
    }

    // Create a copy of the listeners array to prevent issues if listeners are added/removed during emission
    const errors: ListenerError[] = [];
    const now = Date.now();

    [...listeners].forEach((metadata) => {
      try {
        metadata.listener.apply(this, args);
        metadata.timestamp = now;
        metadata.count++;

        // Check if listener has been called too many times
        if (metadata.count >= this.DEFAULT_MAX_INVOCATIONS) {
          const error = new EventEmitterError(
            `Listener for event '${String(eventName)}' has been called ${
              metadata.count
            } times. Consider removing it to prevent memory leaks.`,
          );
          errors.push(new ListenerError('Max invocations exceeded', error));
        }
      } catch (error) {
        const listenerError = new ListenerError(
          `Failed to execute listener for event '${String(eventName)}'`,
          error instanceof Error ? error : new Error(String(error)),
        );
        errors.push(listenerError);
        if (process.env.NODE_ENV !== 'production') {
          console.error(listenerError.message);
        }
      }
    });

    // Emit any errors that occurred during listener execution
    if (errors.length > 0 && eventName !== 'error') {
      errors.forEach((error) => this.emit('error', error));
    }

    return true;
  }

  listenerCount(eventName: string | symbol): number {
    return this.events.get(eventName)?.length || 0;
  }

  prependListener(eventName: string | symbol, listener: Listener): this {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    this.events.get(eventName)!.unshift({
      listener,
      timestamp: Date.now(),
      count: 0,
    });
    return this;
  }

  prependOnceListener(eventName: string | symbol, listener: Listener): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(eventName, onceWrapper);
      listener.apply(this, args);
    };
    return this.prependListener(eventName, onceWrapper);
  }

  eventNames(): Array<string | symbol> {
    return Array.from(this.events.keys());
  }
}

// Create and export a default EventEmitter constructor
export default EventEmitter;
