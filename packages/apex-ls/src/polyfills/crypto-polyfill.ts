/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal crypto polyfill for web worker environments
 * This provides basic crypto functionality using the Web Crypto API
 */

// Use the browser's built-in crypto API
const webCrypto = globalThis.crypto;

// Type assertion to ensure we get the correct ArrayBuffer type
const createArrayBuffer = (length: number): ArrayBuffer => new ArrayBuffer(length);

// Convert between Node.js Buffer and browser TypedArray
function toBuffer(data: ArrayBuffer | Uint8Array): Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return data;
}

// Create a proper BufferSource from Uint8Array for crypto operations
function toBufferSource(data: Uint8Array): ArrayBuffer {
  // Create a new ArrayBuffer and copy the data to ensure proper type compatibility
  const buffer = createArrayBuffer(data.length);
  const view = new Uint8Array(buffer);
  view.set(data);
  return buffer;
}

// Randomness functions
function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  webCrypto.getRandomValues(bytes);
  return bytes;
}

function randomFill<T extends Uint8Array>(
  buffer: T,
  offset?: number,
  size?: number,
): T {
  offset = offset || 0;
  size = size || buffer.length - offset;
  webCrypto.getRandomValues(buffer.subarray(offset, offset + size));
  return buffer;
}

function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const mask = Math.pow(2, Math.ceil(Math.log2(range))) - 1;
  let result: number;

  do {
    const bytes = randomBytes(bytesNeeded);
    result = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      result = (result << 8) | bytes[i];
    }
    result = result & mask;
  } while (result >= range);

  return min + result;
}

// Hash functions
class Hash {
  private algorithm: string;
  private chunks: Uint8Array[];

  constructor(algorithm: string) {
    this.algorithm = algorithm.toLowerCase();
    this.chunks = [];
  }

  update(data: string | Uint8Array, encoding?: string): this {
    if (typeof data === 'string') {
      data = new TextEncoder().encode(data);
    }
    this.chunks.push(toBuffer(data));
    return this;
  }

  async digest(encoding?: string): Promise<Uint8Array> {
    const data = new Uint8Array(
      this.chunks.reduce((acc, chunk) => acc + chunk.length, 0),
    );
    let offset = 0;
    for (const chunk of this.chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    const hashBuffer = await webCrypto.subtle.digest(
      this.algorithm,
      toBufferSource(data),
    );
    return new Uint8Array(hashBuffer);
  }
}

function createHash(algorithm: string): Hash {
  return new Hash(algorithm);
}

// HMAC functions
class Hmac {
  private algorithm: string;
  private key: CryptoKey | null;
  private chunks: Uint8Array[];

  constructor(algorithm: string, key: string | Uint8Array) {
    this.algorithm = algorithm.toLowerCase();
    this.key = null;
    this.chunks = [];

    // Initialize the key
    if (typeof key === 'string') {
      key = new TextEncoder().encode(key);
    }
    webCrypto.subtle
      .importKey(
        'raw',
        toBufferSource(key),
        { name: 'HMAC', hash: { name: this.algorithm } },
        false,
        ['sign'],
      )
      .then((k) => {
        this.key = k;
      });
  }

  update(data: string | Uint8Array, encoding?: string): this {
    if (typeof data === 'string') {
      data = new TextEncoder().encode(data);
    }
    this.chunks.push(toBuffer(data));
    return this;
  }

  async digest(encoding?: string): Promise<Uint8Array> {
    if (!this.key) {
      throw new Error('HMAC key not initialized');
    }

    const data = new Uint8Array(
      this.chunks.reduce((acc, chunk) => acc + chunk.length, 0),
    );
    let offset = 0;
    for (const chunk of this.chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    const signature = await webCrypto.subtle.sign(
      'HMAC',
      this.key,
      toBufferSource(data),
    );
    return new Uint8Array(signature);
  }
}

function createHmac(algorithm: string, key: string | Uint8Array): Hmac {
  return new Hmac(algorithm, key);
}

// Cipher functions
class Cipher {
  private algorithm: string;
  private key: CryptoKey | null;
  private iv: Uint8Array;

  constructor(algorithm: string, key: Uint8Array, iv: Uint8Array) {
    this.algorithm = algorithm.toLowerCase();
    this.key = null;
    this.iv = iv;

    // Initialize the key
    webCrypto.subtle
      .importKey(
        'raw',
        toBufferSource(key),
        { name: 'AES-CBC', length: key.length * 8 },
        false,
        ['encrypt'],
      )
      .then((k) => {
        this.key = k;
      });
  }

  async update(data: Uint8Array): Promise<Uint8Array> {
    if (!this.key) {
      throw new Error('Cipher key not initialized');
    }

    const encrypted = await webCrypto.subtle.encrypt(
      { name: 'AES-CBC', iv: this.iv },
      this.key,
      // @ts-ignore - Type conflict between DOM and WebWorker crypto definitions
      toBufferSource(data),
    );
    return new Uint8Array(encrypted);
  }
}

function createCipheriv(
  algorithm: string,
  key: Uint8Array,
  iv: Uint8Array,
): Cipher {
  return new Cipher(algorithm, key, iv);
}

// Export the crypto module interface
export const crypto = {
  randomBytes,
  randomFill,
  randomInt,
  createHash,
  createHmac,
  createCipheriv,
  // Add Web Crypto API methods
  subtle: webCrypto.subtle,
  getRandomValues: webCrypto.getRandomValues.bind(webCrypto),
};

// Create a proxy to combine our polyfill with the built-in crypto object
const cryptoProxy = new Proxy(webCrypto, {
  get(target: Crypto, prop: string | symbol) {
    // First try to get the property from our polyfill
    if (typeof prop === 'string' && prop in crypto) {
      return (crypto as any)[prop];
    }
    // Fall back to the built-in crypto object
    return (target as any)[prop];
  },
});

// Export the proxied crypto object
export default cryptoProxy;
