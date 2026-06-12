/**
 * Base error response.
 */
global class ErrorResponse {

  global ErrorResponse() {}

  /**
   * Error code.
   */
  global String errorCode;

  /**
   * More error detail, if available.
   */
  global String message;

  global Object clone() {}

}