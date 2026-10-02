/**
 * Use the ProcessSubmitRequest class to submit a record for approval.
 * <p>Usage
 * You must specify the Approval namespace when creating an instance of this class. The constructor for this class takes no arguments. For example:
 * Approval.ProcessSubmitRequest psr = new Approval.ProcessSubmitRequest();
 * <p>Inherited Methods
 * In addition to the methods listed, the ProcessSubmitRequest class has access to all the methods in its parent class, ProcessRequest Class.
 * getComments()
 * getNextApproverIds()
 * setComments(comments)
 * setNextApproverIds(nextApproverIds)
 * <p>Example
 * To view sample code, refer to <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_process_example.htm" target="_blank">Approval Processing Example</a>.
 */
global class ProcessSubmitRequest extends Approval.ProcessRequest {
    global String objectid { get; set; }
    global String processdefinitionnameorid { get; set; }
    global Boolean skipentrycriteria { get; set; }
    global String submitterid { get; set; }

    Object ProcessSubmitRequest() { return null; }

    global Boolean equals(Object obj) { return false; }

    global String getComments() { return null; }

    global List getNextApproverIds() { return null; }

    /**
     * Returns the ID of the record that has been submitted for approval. For example, it can return an account, contact, or custom object record.
     */
    global String getObjectId() { return null; }

    /**
     * Returns the developer name or ID of the process definition.
     * <p>Usage
     * The default is null. If the return value is null, when a user submits a record for approval Salesforce evaluates the entry criteria for all processes applicable to the user.
     */
    global String getProcessDefinitionNameOrId() { return null; }

    /**
     * If getProcessDefinitionNameOrId() returns a value other than null, getSkipEntryCriteria() determines whether to evaluate the entry criteria for the process (true) or not (false).
     */
    global Boolean getSkipEntryCriteria() { return false; }

    /**
     * Returns the user ID of the submitter requesting the approval record. The user must be one of the allowed submitters in the process definition setup.
     */
    global String getSubmitterId() { return null; }

    global Integer hashCode() { return 0; }

    global void setComments(String param1) { }

    global void setNextApproverIds(List param1) { }

    /**
     * Sets the ID of the record to be submitted for approval. For example, it can specify an account, contact, or custom object record.
     */
    global void setObjectId(String param1) { }

    /**
     * Sets the developer name or ID of the process definition to be evaluated.
     * <p>Usage
     * If the process definition name or ID is not set via this method, then by default it is null. If it is null, the submission of a record for approval evaluates entry criteria for all processes applicable to the submitter. The order of evaluation is based on the process order of the setup.
     */
    global void setProcessDefinitionNameOrId(String param1) { }

    /**
     * If the process definition name or ID is not null, setSkipEntryCriteria() determines whether to evaluate the entry criteria for the process (true) or not (false).
     */
    global void setSkipEntryCriteria(Boolean param1) { }

    /**
     * Sets the user ID of the submitter requesting the approval record. The user must be one of the allowed submitters in the process definition setup. If you don’t set a submitter ID, the process uses the current user as the submitter.
     */
    global void setSubmitterId(String param1) { }

    global String toString() { return null; }
}