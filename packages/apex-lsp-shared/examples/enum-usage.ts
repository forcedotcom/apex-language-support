/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  defineEnum,
  isValidEnumKey,
  isValidEnumValue,
  getEnumKeys,
  getEnumValues,
  getEnumEntries,
} from '../src/enumUtils';

/**
 * Example demonstrating the defineEnum utility usage
 */

// Example 1: Basic enum with custom values
const Status = defineEnum([
  ['Active', 1],
  ['Inactive', 0],
  ['Pending', 2],
] as const);

console.log('=== Basic Enum Example ===');
console.log('Status.Active:', Status.Active); // 1
console.log('Status[1]:', Status[1]); // 'Active'
console.log('Status.Inactive:', Status.Inactive); // 0
console.log('Status[0]:', Status[0]); // 'Inactive'

// Example 2: Enum with default values (array indices)
const Colors = defineEnum([['Red'], ['Green'], ['Blue']] as const);

console.log('\n=== Default Values Example ===');
console.log('Colors.Red:', Colors.Red); // 0
console.log('Colors[0]:', Colors[0]); // 'Red'
console.log('Colors.Green:', Colors.Green); // 1
console.log('Colors[1]:', Colors[1]); // 'Green'

// Example 3: Mixed custom and default values
const Priority = defineEnum([
  ['Low', 1],
  ['Medium'], // defaults to 2 since 1 is taken
  ['High', 10],
  ['Critical'], // defaults to 3
] as const);

console.log('\n=== Mixed Values Example ===');
console.log('Priority.Low:', Priority.Low); // 1
console.log('Priority.Medium:', Priority.Medium); // 2
console.log('Priority.High:', Priority.High); // 10
console.log('Priority.Critical:', Priority.Critical); // 3

// Example 4: String values
const Types = defineEnum([
  ['String', 'string'],
  ['Number', 'number'],
  ['Boolean', 'boolean'],
] as const);

console.log('\n=== String Values Example ===');
console.log('Types.String:', Types.String); // 'string'
console.log('Types["string"]:', Types['string']); // 'String'

// Example 5: Boolean values
const Flags = defineEnum([
  ['Enabled', true],
  ['Disabled', false],
] as const);

console.log('\n=== Boolean Values Example ===');
console.log('Flags.Enabled:', Flags.Enabled); // true
console.log('Flags[true]:', Flags[true as any]); // 'Enabled'

// Example 6: Validation
console.log('\n=== Validation Example ===');
console.log(
  'isValidEnumKey(Status, "Active"):',
  isValidEnumKey(Status, 'Active'),
); // true
console.log(
  'isValidEnumKey(Status, "Invalid"):',
  isValidEnumKey(Status, 'Invalid'),
); // false
console.log('isValidEnumValue(Status, 1):', isValidEnumValue(Status, 1)); // true
console.log('isValidEnumValue(Status, 999):', isValidEnumValue(Status, 999)); // false

// Example 7: Utility functions
console.log('\n=== Utility Functions Example ===');
console.log('getEnumKeys(Status):', getEnumKeys(Status)); // ['Active', 'Inactive', 'Pending']
console.log('getEnumValues(Status):', getEnumValues(Status)); // [1, 0, 2]
console.log('getEnumEntries(Status):', getEnumEntries(Status)); // [['Active', 1], ['Inactive', 0], ['Pending', 2]]

// Example 8: Zod validation schemas
console.log('\n=== Zod Validation Example ===');
try {
  Status.keySchema.parse('Active'); // ✅ Valid
  console.log('Valid key "Active" parsed successfully');
} catch (error) {
  console.log('Error parsing valid key:', error);
}

try {
  Status.keySchema.parse('Invalid'); // ❌ Invalid
  console.log('Invalid key parsed successfully (unexpected)');
} catch (error) {
  console.log(
    'Error parsing invalid key (expected):',
    (error as Error).message,
  );
}

try {
  Status.valueSchema.parse(1); // ✅ Valid
  console.log('Valid value 1 parsed successfully');
} catch (error) {
  console.log('Error parsing valid value:', error);
}

try {
  Status.valueSchema.parse(999); // ❌ Invalid
  console.log('Invalid value parsed successfully (unexpected)');
} catch (error) {
  console.log(
    'Error parsing invalid value (expected):',
    (error as Error).message,
  );
}

// Example 9: Type safety
console.log('\n=== Type Safety Example ===');
function processStatus(status: (typeof Status)[keyof typeof Status]) {
  console.log('Processing status:', status);
}

// These work (type-safe):
processStatus(Status.Active);
processStatus(Status.Inactive);
processStatus(Status.Pending);

// This would cause a TypeScript error:
// processStatus(999); // Type '999' is not assignable to type '1 | 0 | 2'

// Example 10: Memory efficiency comparison
console.log('\n=== Memory Efficiency Example ===');
const traditionalEnum = {
  Active: 1,
  Inactive: 0,
  Pending: 2,
};

const memoryEfficientEnum = defineEnum([
  ['Active', 1],
  ['Inactive', 0],
  ['Pending', 2],
] as const);

console.log('Traditional enum keys:', Object.keys(traditionalEnum)); // ['Active', 'Inactive', 'Pending']
console.log('Memory efficient enum keys:', getEnumKeys(memoryEfficientEnum)); // ['Active', 'Inactive', 'Pending']

// The memory efficient enum provides additional benefits:
console.log(
  'Memory efficient enum has validation:',
  !!memoryEfficientEnum.keySchema,
); // true
console.log(
  'Memory efficient enum has bidirectional mapping:',
  memoryEfficientEnum[1] === 'Active',
); // true
console.log(
  'Memory efficient enum is frozen:',
  Object.isFrozen(memoryEfficientEnum),
); // true

export { Status, Colors, Priority, Types, Flags };
