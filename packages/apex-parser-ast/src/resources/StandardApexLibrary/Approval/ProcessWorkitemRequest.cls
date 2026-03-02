/**
 * Use the ProcessWorkitemRequest class for processing an approval request after it is submitted.
 */
public class ProcessWorkitemRequest {

  /**
   * Returns the type of action already associated with the approval request. Valid values are: Approve, Reject, or Removed.
   * @return String
   */
  public String getAction() {}

  /**
   * Returns the ID of the approval request that is in the process of being approved, rejected, or removed.
   * @return String
   */
  public String getWorkitemId() {}

  /**
   * Sets the type of action to take for processing an approval request.
   * @param actionType Valid values are: Approve, Reject, or Removed. Only system administrators can specify Removed.
   * @return Void
   */
  public Void setAction(String actionType) {}

  /**
   * Sets the ID of the approval request that is being approved, rejected, or removed.
   * @param id 
   * @return Void
   */
  public Void setWorkitemId(String id) {}

}