/**
 * Represents an error that the RenderEmailTemplateBodyResult object can contain.
 */
global class RenderEmailTemplateError {

  global RenderEmailTemplateError() {}

  /**
   * Returns the name of the merge field in the error.
   * @return String
   */
  global String getFieldName() {}

  /**
   * Returns a message describing the error.
   * @return String
   */
  global String getMessage() {}

  /**
   * Returns the offset within the supplied body text where the error was discovered. If the offset cannot be determined, -1 is returned.
   * @return Integer
   */
  global Integer getOffset() {}

  /**
   * Returns a Salesforce API status code.
   * @return System.StatusCode
   */
  global System.StatusCode getStatusCode() {}

  global Object clone() {}

}