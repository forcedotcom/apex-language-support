/**
 * Error representation.
 */
global class QuoteError {

  global QuoteError() {}

  /**
   * The error code.
   */
  global String code;

  /**
   * Details of the error, if available.
   */
  global String message;

  global Object clone() {}

}