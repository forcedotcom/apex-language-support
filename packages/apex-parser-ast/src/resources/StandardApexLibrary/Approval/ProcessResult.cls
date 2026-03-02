/**
 * After you submit a record for approval, use the ProcessResult class to process the results of an approval process.
 */
public class ProcessResult {

  /**
   * The ID of the record being processed.
   * @return String
   */
  public String getEntityId() {}

  /**
   * If an error occurred, returns an array of one or more database error objects including the error code and description.
   * @return Database.Error[]
   */
  public Database.Error[] getErrors() {}

  /**
   * The ID of the approval process that has been submitted for approval.
   * @return String
   */
  public String getInstanceId() {}

  /**
   * The status of the current approval process. Valid values are: Approved, Rejected, Removed or Pending.
   * @return String
   */
  public String getInstanceStatus() {}

  /**
   * The IDs of the new items submitted to the approval process. There can be 0 or 1 approval processes.
   * @return ID []
   */
  public ID [] getNewWorkitemIds() {}

  /**
   * A Boolean value that is set to true if the approval process completed successfully; otherwise, it is set to false .
   * @return Boolean
   */
  public Boolean isSuccess() {}

}