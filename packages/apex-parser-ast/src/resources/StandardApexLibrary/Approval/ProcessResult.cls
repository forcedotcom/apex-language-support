/**
 * After you submit a record for approval, use the ProcessResult class to process the results of an approval process.
 * Usage
 * A ProcessResult object is returned by the process method. You must specify the Approval namespace when creating an instance of this class. For example:
 * Approval.ProcessResult result = Approval.process(req1);
 */
global class ProcessResult {
    global List actorids { get; }
    global String entityid { get; }
    global List errors { get; }
    global String instanceid { get; }
    global String instancestatus { get; }
    global List newworkitemids { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    global List getActorIds() { return null; }

    /**
     * The ID of the record being processed.
     */
    global String getEntityId() { return null; }

    /**
     * If an error occurred, returns an array of one or more database error objects including the error code and description.
     */
    global List getErrors() { return null; }

    /**
     * The ID of the approval process that has been submitted for approval.
     */
    global String getInstanceId() { return null; }

    /**
     * The status of the current approval process. Valid values are: Approved, Rejected, Removed or Pending.
     */
    global String getInstanceStatus() { return null; }

    /**
     * The IDs of the new items submitted to the approval process. There can be 0 or 1 approval processes.
     */
    global List getNewWorkitemIds() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * A Boolean value that is set to true if the approval process completed successfully; otherwise, it is set to false.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}