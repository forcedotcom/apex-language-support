/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Standard Library Cache Module
 *
 * This module provides functionality for loading the Apex Standard Library
 * from pre-compiled binary cache format (apex-stdlib.bin.gz).
 */

// Binary cache format
export {
  BinarySerializer,
  type SerializationInput,
  type SerializationResult,
} from './binary-serializer';

export {
  BinaryDeserializer,
  type BinaryDeserializationResult,
} from './binary-deserializer';

export { StringTableBuilder, StringTableReader } from './string-table';

export {
  BINARY_FORMAT_MAGIC,
  BINARY_FORMAT_VERSION,
  HEADER_SIZE,
  SYMBOL_RECORD_SIZE,
  TYPE_ENTRY_RECORD_SIZE,
  type BinaryHeader,
} from './binary-format';

export { getEmbeddedBinaryCacheDataUrl } from './stdlib-binary-cache-data';
