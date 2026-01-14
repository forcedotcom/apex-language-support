/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Standard Library Protobuf Cache Module
 *
 * This module provides functionality for loading the Apex Standard Library
 * from a pre-compiled Protocol Buffers cache, with automatic fallback to
 * ZIP-based loading if the cache is unavailable.
 */

export {
  StandardLibraryCacheLoader,
  loadStandardLibraryCache,
  isProtobufCacheAvailable,
  type CacheLoadResult,
  type CacheLoaderOptions,
} from './stdlib-cache-loader';

export {
  StandardLibraryDeserializer,
  type DeserializationResult,
} from './stdlib-deserializer';

export {
  StandardLibrarySerializer,
  type NamespaceData,
} from './stdlib-serializer';
