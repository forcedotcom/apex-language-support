/**
 * Error response.
 */
global class CdpErrorResponse {

  global CdpErrorResponse() {}

  /**
   * Error code.
   */
  global String errorCode;

  /**
   * Message stating the reason for the error, if any.
   */
  global String message;

  global Object clone() {}

}