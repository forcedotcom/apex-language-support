/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Simple EventEmitter implementation for browser environment
 */
class EventEmitter {
  private events: Map<string | symbol, Function[]> = new Map();
  private maxListeners = 10;

  addListener(event: string | symbol, listener: Function): this {
    return this.on(event, listener);
  }

  on(event: string | symbol, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event)!;
    if (listeners.length >= this.maxListeners) {
      console.warn(
        `MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${listeners.length} ${String(
          event,
        )} listeners added. Use emitter.setMaxListeners() to increase limit`,
      );
    }

    listeners.push(listener);
    return this;
  }

  once(event: string | symbol, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener.apply(this, args);
    };
    return this.on(event, onceWrapper);
  }

  removeListener(event: string | symbol, listener: Function): this {
    if (!this.events.has(event)) {
      return this;
    }

    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }

    return this;
  }

  off(event: string | symbol, listener: Function): this {
    return this.removeListener(event, listener);
  }

  removeAllListeners(event?: string | symbol): this {
    if (event) {
      this.events.delete(event);
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

  listeners(event: string | symbol): Function[] {
    return this.events.get(event) || [];
  }

  rawListeners(event: string | symbol): Function[] {
    return this.listeners(event);
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    if (!this.events.has(event)) {
      return false;
    }

    const listeners = this.events.get(event)!;
    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }

    return true;
  }

  listenerCount(event: string | symbol): number {
    return this.listeners(event).length;
  }

  prependListener(event: string | symbol, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event)!;
    listeners.unshift(listener);
    return this;
  }

  prependOnceListener(event: string | symbol, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener.apply(this, args);
    };
    return this.prependListener(event, onceWrapper);
  }

  eventNames(): Array<string | symbol> {
    return Array.from(this.events.keys());
  }
}

// Export the EventEmitter class
if (typeof globalThis !== 'undefined') {
  (globalThis as any).events = {
    EventEmitter,
  };
}

export { EventEmitter };
