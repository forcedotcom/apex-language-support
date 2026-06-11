/**
 * Represents information about an error that occurred during a DML operation when using a Database method.
 */
global class Error {

  global Error() {}

  /**
   * Returns an array of one or more field names. Identifies which fields in the object, if any, affected the error condition.
   * @return String[]
   */
  global String[] getFields() {}

  /**
   * Returns the error message text.
   * @return String
   */
  global String getMessage() {}

  /**
   * Returns a code that characterizes the error.
   * @return StatusCode
   */
  global StatusCode getStatusCode() {}

  global Object clone() {}

}