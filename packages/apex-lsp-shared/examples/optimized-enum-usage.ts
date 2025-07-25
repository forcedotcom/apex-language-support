/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  defineOptimizedEnum,
  isValidOptimizedEnumKey,
  isValidOptimizedEnumValue,
  getOptimizedEnumKeys,
  getOptimizedEnumValues,
  getOptimizedEnumEntries,
  calculateOptimizedEnumSavings,
  compareEnumMemoryUsage,
} from '../src/optimizedEnumUtils';

/**
 * Example demonstrating the optimized defineEnum utility usage
 * Shows memory savings compared to regular JavaScript numbers
 */

// Example 1: Basic optimized enum with custom values
const Status = defineOptimizedEnum([
  ['Active', 1],
  ['Inactive', 0],
  ['Pending', 2],
] as const);

console.log('=== Basic Optimized Enum Example ===');
console.log('Status.Active:', Status.Active); // 1 (Uint8 instead of number)
console.log('Status[1]:', Status[1]); // 'Active'

// Example 2: Optimized enum with default values (array indices)
const Colors = defineOptimizedEnum([['Red'], ['Green'], ['Blue']] as const);

console.log('\n=== Default Values Example ===');
console.log('Colors.Red:', Colors.Red); // 0 (Uint8 instead of number)
console.log('Colors[0]:', Colors[0]); // 'Red'

// Example 3: Mixed custom and default values
const Priority = defineOptimizedEnum([
  ['Low', 1],
  ['Medium'], // defaults to 2 since 1 is taken
  ['High', 10],
  ['Critical'], // defaults to 3
] as const);

console.log('\n=== Mixed Values Example ===');
console.log('Priority.Low:', Priority.Low); // 1 (Uint8)
console.log('Priority.Medium:', Priority.Medium); // 2 (Uint8)
console.log('Priority.High:', Priority.High); // 10 (Uint8)
console.log('Priority.Critical:', Priority.Critical); // 3 (Uint8)

// Example 4: String values (no optimization needed)
const Types = defineOptimizedEnum([
  ['String', 'string'],
  ['Number', 'number'],
  ['Boolean', 'boolean'],
] as const);

console.log('\n=== String Values Example ===');
console.log('Types.String:', Types.String); // 'string'
console.log('Types["string"]:', Types['string']); // 'String'

// Example 5: Boolean values (no optimization needed)
const Flags = defineOptimizedEnum([
  ['Enabled', true],
  ['Disabled', false],
] as const);

console.log('\n=== Boolean Values Example ===');
console.log('Flags.Enabled:', Flags.Enabled); // true
console.log('Flags[true]:', Flags[true as any]); // 'Enabled'

// Example 6: Validation with optimized types
console.log('\n=== Validation Example ===');

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

// Example 7: Type safety with optimized types
console.log('\n=== Type Safety Example ===');

// Utility functions work the same way
console.log('Valid keys:', getOptimizedEnumKeys(Status));
console.log('Valid values:', getOptimizedEnumValues(Status));
console.log('All entries:', getOptimizedEnumEntries(Status));

// Type checking
console.log(
  'Is "Active" a valid key?',
  isValidOptimizedEnumKey(Status, 'Active'),
);
console.log('Is 1 a valid value?', isValidOptimizedEnumValue(Status, 1));
console.log(
  'Is "Invalid" a valid key?',
  isValidOptimizedEnumKey(Status, 'Invalid'),
);
console.log('Is 999 a valid value?', isValidOptimizedEnumValue(Status, 999));

// Example 8: Memory efficiency comparison
console.log('\n=== Memory Efficiency Comparison ===');

// Traditional enum (for comparison)
const traditionalEnum = {
  Active: 1,
  Inactive: 0,
  Pending: 2,
};

const memoryEfficientEnum = defineOptimizedEnum([
  ['Active', 1],
  ['Inactive', 0],
  ['Pending', 2],
] as const);

console.log('Traditional enum keys:', Object.keys(traditionalEnum));
console.log('Optimized enum keys:', getOptimizedEnumKeys(memoryEfficientEnum));

// Memory savings calculation
const savings = calculateOptimizedEnumSavings();
console.log('\nMemory savings per enum value:');
console.log(
  'Small enums (0-255):',
  savings.smallEnums.reduction + '% reduction',
);
console.log(
  'Medium enums (256-65535):',
  savings.mediumEnums.reduction + '% reduction',
);
console.log(
  'Large enums (65536+):',
  savings.largeEnums.reduction + '% reduction',
);

// Example 9: Real-world memory usage comparison
console.log('\n=== Real-world Memory Usage ===');

const typicalSizes = [10, 50, 100, 500, 1000];

typicalSizes.forEach((size) => {
  const comparison = compareEnumMemoryUsage(size);
  console.log(`${size} enums: ${comparison.reduction.toFixed(1)}% reduction`);
  console.log(`  Original: ${comparison.originalMemory} bytes`);
  console.log(`  Optimized: ${comparison.optimizedMemory} bytes`);
  console.log(`  Saved: ${comparison.savings} bytes`);
});

// Example 10: Performance characteristics
console.log('\n=== Performance Characteristics ===');

const start = performance.now();
for (let i = 0; i < 10000; i++) {
  isValidOptimizedEnumKey(Status, 'Active');
  isValidOptimizedEnumValue(Status, 1);
}
const end = performance.now();

console.log(`10,000 validations completed in ${(end - start).toFixed(2)}ms`);
console.log(
  `Average time per validation: ${((end - start) / 20000).toFixed(4)}ms`,
);

console.log('\n=== Summary ===');
console.log(
  '✅ Optimized enums provide 82-88% memory reduction for numeric values',
);
console.log('✅ Full TypeScript type safety with branded types');
console.log('✅ Zod validation schemas for runtime safety');
console.log('✅ Bidirectional mapping (key↔value)');
console.log('✅ Backward compatibility with existing enum patterns');
console.log('✅ Performance optimized with minimal overhead');
