/**
 * The ProcessRequest class is the parent class for the ProcessSubmitRequest and ProcessWorkitemRequest classes. Use the ProcessRequest class to write generic Apex that can process objects from either class.
 */
global class ProcessRequest {

  global ProcessRequest() {}

  /**
   * Returns the comments that have been added previously to the approval request.
   * @return String
   */
  global String getComments() {}

  /**
   * Returns the list of user IDs of user specified as approvers.
   * @return ID[]
   */
  global ID[] getNextApproverIds() {}

  /**
   * Sets the comments to be added to the approval request.
   * @param comments 
   */
  global void setComments(String comments) {}

  /**
   * If the next step in your approval process is another Apex approval process, you specify exactly one user ID as the next approver. If not, you cannot specify a user ID and this method must be null . This method sets the ActorId field of the associated ProcessInstanceWorkItem.
   * @param nextApproverIds Must be a single-entry list.
   */
  global void setNextApproverIds(ID[] nextApproverIds) {}

  global Object clone() {}

}