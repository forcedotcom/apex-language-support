/**
 * Represents an error that the RenderEmailTemplateBodyResult object can contain.
 */
public class RenderEmailTemplateError {

  /**
   * Returns the name of the merge field in the error.
   * @return String
   */
  public String getFieldName() {}

  /**
   * Returns a message describing the error.
   * @return String
   */
  public String getMessage() {}

  /**
   * Returns the offset within the supplied body text where the error was discovered. If the offset cannot be determined, -1 is returned.
   * @return Integer
   */
  public Integer getOffset() {}

  /**
   * Returns a Salesforce API status code.
   * @return System.StatusCode
   */
  public System.StatusCode getStatusCode() {}

}