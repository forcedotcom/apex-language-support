/**
 * The ProcessRequest class is the parent class for the ProcessSubmitRequest and ProcessWorkitemRequest classes. Use the ProcessRequest class to write generic Apex that can process objects from either class.
 * Usage
 * The request must be instantiated via the child classes, ProcessSubmitRequest and ProcessWorkItemRequest.
 */
global class ProcessRequest {
    global String comments { get; set; }
    global List nextapproverids { get; set; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the comments that have been added previously to the approval request.
     */
    global String getComments() { return null; }

    /**
     * Returns the list of user IDs of user specified as approvers.
     */
    global List getNextApproverIds() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Sets the comments to be added to the approval request.
     */
    global void setComments(String param1) { }

    /**
     * If the next step in your approval process is another Apex approval process, you specify exactly one user ID as the next approver. If not, you cannot specify a user ID and this method must be null. This method sets the ActorId field of the associated ProcessInstanceWorkItem.
     */
    global void setNextApproverIds(List param1) { }

    global String toString() { return null; }
}