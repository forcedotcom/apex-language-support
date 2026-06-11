/**
 * Shifts from pattern error response.
 */
global class ShiftsFromPatternError {

  global ShiftsFromPatternError() {}

  /**
   * Error code.
   */
  global String code;

  /**
   * ID of invalid service resource.
   */
  global String invalidServiceResourceId;

  /**
   * Error message.
   */
  global String message;

  global Object clone() {}

}