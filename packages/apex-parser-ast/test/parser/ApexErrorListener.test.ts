/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mapSyntaxErrorToCode } from '../../src/parser/listeners/ApexErrorListener';
import { ErrorCodes } from '../../src/generated/ErrorCodes';

describe('mapSyntaxErrorToCode', () => {
  it('should map illegal string literal message to ILLEGAL_STRING_LITERAL', () => {
    expect(mapSyntaxErrorToCode('Illegal string literal: invalid escape')).toBe(
      ErrorCodes.ILLEGAL_STRING_LITERAL,
    );
    expect(mapSyntaxErrorToCode('Illegal string literal: something else')).toBe(
      ErrorCodes.ILLEGAL_STRING_LITERAL,
    );
  });

  it('should map illegal double message to ILLEGAL_DOUBLE_LITERAL', () => {
    expect(mapSyntaxErrorToCode('Illegal double')).toBe(
      ErrorCodes.ILLEGAL_DOUBLE_LITERAL,
    );
    expect(mapSyntaxErrorToCode('illegal double literal')).toBe(
      ErrorCodes.ILLEGAL_DOUBLE_LITERAL,
    );
  });

  it('should map invalid date/time messages', () => {
    expect(
      mapSyntaxErrorToCode("Invalid Time ''foo''. Apex times must be"),
    ).toBe(ErrorCodes.INVALID_TIME);
    expect(
      mapSyntaxErrorToCode("Invalid Date ''bar''. Apex dates must be"),
    ).toBe(ErrorCodes.INVALID_DATE);
    expect(
      mapSyntaxErrorToCode("Invalid DateTime ''baz''. Apex DateTimes must be"),
    ).toBe(ErrorCodes.INVALID_DATE_TIME);
  });
});
