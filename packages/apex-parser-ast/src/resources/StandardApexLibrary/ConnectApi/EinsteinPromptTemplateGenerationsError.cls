/**
 * Error response to a prompt template generation request.
 */
global class EinsteinPromptTemplateGenerationsError {

  /**
   * Message stating the reason for the error, if any.
   */
  global String errorMessage;

  /**
   * HTTP status code, if any.
   */
  global String httpErrorCode;

  /**
   * Translated error message, if available.
   */
  global String localizedErrorMessage;

  /**
   * Message code associated with the error message, if any.
   */
  global String messageCode;

}