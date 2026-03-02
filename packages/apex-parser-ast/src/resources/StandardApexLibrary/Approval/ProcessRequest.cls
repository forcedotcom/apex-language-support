/**
 * The ProcessRequest class is the parent class for the ProcessSubmitRequest and ProcessWorkitemRequest classes. Use the ProcessRequest class to write generic Apex that can process objects from either class.
 */
public class ProcessRequest {

  /**
   * Returns the comments that have been added previously to the approval request.
   * @return String
   */
  public String getComments() {}

  /**
   * Returns the list of user IDs of user specified as approvers.
   * @return ID []
   */
  public ID [] getNextApproverIds() {}

  /**
   * Sets the comments to be added to the approval request.
   * @param comments 
   * @return Void
   */
  public Void setComments(String comments) {}

  /**
   * If the next step in your approval process is another Apex approval process, you specify exactly one user ID as the next approver. If not, you cannot specify a user ID and this method must be null . This method sets the ActorId field of the associated ProcessInstanceWorkItem.
   * @param nextApproverIds Must be a single-entry list.
   * @return Void
   */
  public Void setNextApproverIds(ID [] nextApproverIds) {}

}