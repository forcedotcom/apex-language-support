/**
 * Represents an error that the SendEmailResult object may contain.
 */
global class SendEmailError {

  /**
   * A list of one or more field names. Identifies which fields in the object, if any, affected the error condition.
   * @return String []
   */
  public String [] getFields() {}

  /**
   * The text of the error message.
   * @return String
   */
  public String getMessage() {}

  /**
   * Returns a code that characterizes the error.
   * @return System.StatusCode
   */
  public System.StatusCode getStatusCode() {}

  /**
   * The ID of the target record for which the error occurred.
   * @return String
   */
  public String getTargetObjectId() {}

}