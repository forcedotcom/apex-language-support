/**
 * Use the ProcessWorkitemRequest class for processing an approval request after it is submitted.
 * Usage
 * You must specify the Approval namespace when creating an instance of this class. The constructor for this class takes no arguments. For example:
 * Approval.ProcessWorkitemRequest pwr = new Approval.ProcessWorkitemRequest();
 * Inherited Methods
 * In addition to the methods listed, the ProcessWorkitemRequest class has access to all the methods in its parent class, ProcessRequest Class:
 * getComments()
 * getNextApproverIds()
 * setComments(comments)
 * setNextApproverIds(nextApproverIds)
 */
global class ProcessWorkitemRequest extends Approval.ProcessRequest {
    global String action { get; set; }
    global String workitemid { get; set; }

    global ProcessWorkitemRequest() { }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the type of action already associated with the approval request. Valid values are: Approve, Reject, or Removed.
     */
    global String getAction() { return null; }

    global String getComments() { return null; }

    global List getNextApproverIds() { return null; }

    /**
     * Returns the ID of the approval request that is in the process of being approved, rejected, or removed.
     */
    global String getWorkitemId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Sets the type of action to take for processing an approval request.
     */
    global void setAction(String param1) { }

    global void setComments(String param1) { }

    global void setNextApproverIds(List param1) { }

    /**
     * Sets the ID of the approval request that is being approved, rejected, or removed.
     */
    global void setWorkitemId(String param1) { }

    global String toString() { return null; }
}