/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

describe('Position Logic Debug Test', () => {
  it('should correctly calculate isWithinBounds for FileUtilities class', () => {
    // Test position from the failing test
    const position = { line: 1, character: 21 };

    // Symbol location from the logs
    const symbolLocation = {
      startLine: 1,
      startColumn: 20,
      endLine: 1,
      endColumn: 40,
    };

    // Replicate the exact logic from ApexSymbolManager
    const isWithinBounds =
      (position.line > symbolLocation.startLine ||
        (position.line === symbolLocation.startLine &&
          position.character >= symbolLocation.startColumn)) &&
      (position.line < symbolLocation.endLine ||
        (position.line === symbolLocation.endLine &&
          position.character <= symbolLocation.endColumn));

    // Calculate symbol size
    const symbolSize =
      (symbolLocation.endLine - symbolLocation.startLine) * 1000 +
      (symbolLocation.endColumn - symbolLocation.startColumn);

    console.log('Position:', position);
    console.log('Symbol location:', symbolLocation);
    console.log('isWithinBounds calculation:');
    console.log(
      '  position.line > startLine:',
      position.line > symbolLocation.startLine,
    );
    console.log(
      '  position.line === startLine:',
      position.line === symbolLocation.startLine,
    );
    console.log(
      '  position.character >= startColumn:',
      position.character >= symbolLocation.startColumn,
    );
    console.log(
      '  position.line < endLine:',
      position.line < symbolLocation.endLine,
    );
    console.log(
      '  position.line === endLine:',
      position.line === symbolLocation.endLine,
    );
    console.log(
      '  position.character <= endColumn:',
      position.character <= symbolLocation.endColumn,
    );
    console.log('  isWithinBounds:', isWithinBounds);
    console.log('  symbolSize:', symbolSize);
    console.log('  symbolSize < 200:', symbolSize < 200);

    // This should be true based on the logic
    expect(isWithinBounds).toBe(true);
    expect(symbolSize).toBe(20);
    expect(symbolSize < 200).toBe(true);
  });
});
