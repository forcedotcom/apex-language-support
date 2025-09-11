/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CaseInsensitiveString,
  createCaseInsensitiveString,
} from './CaseInsensitiveString';
import {
  caseInsensitiveEquals,
  caseInsensitiveCompare,
  caseInsensitiveArrayUtils,
  caseInsensitiveObjectUtils,
} from './caseInsensitiveStringUtils';

/**
 * Example usage of case-insensitive string solutions
 */
export function demonstrateCaseInsensitiveStrings() {
  console.log('=== Case-Insensitive String Solutions ===\n');

  // Option 1: CaseInsensitiveString Class
  console.log('1. CaseInsensitiveString Class:');
  const str1 = new CaseInsensitiveString('Hello World');
  const str2 = new CaseInsensitiveString('HELLO WORLD');

  console.log(`str1.equals(str2): ${str1.equals(str2)}`); // true
  console.log(`str1.equals('hello world'): ${str1.equals('hello world')}`); // true
  console.log(`str1.startsWith('hello'): ${str1.startsWith('hello')}`); // true
  console.log(`str1.includes('WORLD'): ${str1.includes('WORLD')}`); // true
  console.log(`str1.toString(): ${str1.toString()}`); // "Hello World"

  // With proxy for bracket notation
  const str3 = createCaseInsensitiveString('Hello');
  console.log(`str3[0]: ${str3[0]}`); // "H"
  console.log(`str3[1]: ${str3[1]}`); // "e"
  console.log();

  // Option 2: Functional Utilities
  console.log('2. Functional Utilities:');
  console.log(
    `caseInsensitiveEquals('Hello', 'hello'): ${caseInsensitiveEquals('Hello', 'hello')}`,
  ); // true
  console.log(
    `caseInsensitiveCompare('apple', 'BANANA'): ${caseInsensitiveCompare('apple', 'BANANA')}`,
  ); // negative number

  // Array operations
  const names = ['Alice', 'bob', 'CHARLIE', 'david'];
  const sorted = caseInsensitiveArrayUtils.sort(names, (name) => name);
  console.log(`Sorted names: ${sorted.join(', ')}`); // Alice, bob, CHARLIE, david

  const filtered = caseInsensitiveArrayUtils.filter(names, (name) => name, 'a');
  console.log(`Names containing 'a': ${filtered.join(', ')}`); // Alice, CHARLIE, david
  console.log();

  // Object operations
  console.log('3. Object Operations:');
  const obj = { Hello: 'world', FOO: 'bar' };
  console.log(
    `obj has 'hello': ${caseInsensitiveObjectUtils.hasProperty(obj, 'hello')}`,
  ); // true
  console.log(
    `obj has 'foo': ${caseInsensitiveObjectUtils.hasProperty(obj, 'foo')}`,
  ); // true
  console.log(
    `obj['hello']: ${caseInsensitiveObjectUtils.getProperty(obj, 'hello')}`,
  ); // "world"
  console.log(
    `obj['FOO']: ${caseInsensitiveObjectUtils.getProperty(obj, 'FOO')}`,
  ); // "bar"
  console.log();

  // Integration with your existing CaseInsensitiveMap
  console.log('4. Integration with CaseInsensitiveMap:');
  const map = new Map<string, string>();

  // Use the lowerValue for consistent key storage
  map.set(str1.lowerValue, 'value1');
  map.set(str2.lowerValue, 'value2');

  console.log(`Map size: ${map.size}`); // 1 (both keys are the same)
  console.log(`Map.get('hello world'): ${map.get('hello world')}`); // "value2"
  console.log();

  // Performance comparison
  console.log('5. Performance Considerations:');
  console.log(
    '- CaseInsensitiveString: Good for objects that need to behave like strings',
  );
  console.log(
    '- Functional utilities: Good for one-off operations and functional programming',
  );
  console.log('- Use lowerValue for consistent map keys');
  console.log('- Consider memory usage for large datasets');
}

// Example of using with your existing CaseInsensitiveMap
export function integrateWithCaseInsensitiveMap() {
  console.log('\n=== Integration with CaseInsensitiveMap ===');

  // Import your existing CaseInsensitiveMap
  // import { CaseInsensitiveMap } from './CaseInsensitiveMap';

  // Example usage with CaseInsensitiveString
  const map = new Map<string, any>();

  const key1 = new CaseInsensitiveString('MyClass');
  const key2 = new CaseInsensitiveString('myclass');
  const key3 = new CaseInsensitiveString('MYCLASS');

  // All these would be the same key in a case-insensitive map
  map.set(key1.lowerValue, { type: 'class', name: 'MyClass' });
  map.set(key2.lowerValue, { type: 'class', name: 'myclass' });
  map.set(key3.lowerValue, { type: 'class', name: 'MYCLASS' });

  console.log(`Map size: ${map.size}`); // 1
  console.log(
    `All keys are equivalent: ${key1.equals(key2) && key2.equals(key3)}`,
  ); // true

  // When retrieving, use the same normalization
  const result = map.get('myclass');
  console.log(`Retrieved: ${JSON.stringify(result)}`);
}
