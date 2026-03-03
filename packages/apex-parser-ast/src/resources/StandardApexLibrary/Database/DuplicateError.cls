/**
 * Contains information about an error that occurred when an attempt was made to save a duplicate record. Use if your organization has set up duplicate rules, which are part of the Duplicate Management feature.
 */
global class DuplicateError {

  /**
   * Returns the details of a duplicate rule and duplicate records found by the duplicate rule.
   * @return Datacloud.DuplicateResult
   */
  public Datacloud.DuplicateResult getDuplicateResult() {}

  /**
   * Returns an array of one or more field names. Identifies which fields in the object, if any, affected the error condition.
   * @return List< String >
   */
  public List< String > getFields() {}

  /**
   * Returns the error message text.
   * @return String
   */
  public String getMessage() {}

  /**
   * Returns a code that characterizes the error.
   * @return StatusCode
   */
  public StatusCode getStatusCode() {}

}