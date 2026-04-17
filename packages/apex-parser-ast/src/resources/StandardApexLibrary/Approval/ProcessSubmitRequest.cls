/**
 * Use the ProcessSubmitRequest class to submit a record for approval.
 */
global class ProcessSubmitRequest {

  /**
   * Returns the ID of the record that has been submitted for approval. For example, it can return an account, contact, or custom object record.
   * @return String
   */
  public String getObjectId() {}

  /**
   * Returns the developer name or ID of the process definition.
   * @return String
   */
  public String getProcessDefinitionNameOrId() {}

  /**
   * If getProcessDefinitionNameOrId() returns a value other than null , getSkipEntryCriteria() determines whether to evaluate the entry criteria for the process ( true ) or not ( false ).
   * @return Boolean
   */
  public Boolean getSkipEntryCriteria() {}

  /**
   * Returns the user ID of the submitter requesting the approval record. The user must be one of the allowed submitters in the process definition setup.
   * @return String
   */
  public String getSubmitterId() {}

  /**
   * Sets the ID of the record to be submitted for approval. For example, it can specify an account, contact, or custom object record.
   * @param recordId 
   */
  public void setObjectId(String recordId) {}

  /**
   * Sets the developer name or ID of the process definition to be evaluated.
   * @param nameOrId The process definition developer name or process definition ID. The record is submitted to this specific process. If set to null , submission of a record approval follows standard evaluation; that is, every entry criteria of the process definition in the process order is evaluated and the one that satisfies is picked and submitted.
   */
  public void setProcessDefinitionNameOrId(String nameOrId) {}

  /**
   * If the process definition name or ID is not null, setSkipEntryCriteria() determines whether to evaluate the entry criteria for the process ( true ) or not ( false ).
   * @param skipEntryCriteria If set to true , request submission skips the evaluation of entry criteria for the process set in setProcessDefinitionNameOrId(nameOrId) . If the process definition name or ID is not specified, this parameter is ignored and standard evaluation is followed based on process order. If set to false , or if this method isn’t called, the entry criteria is not skipped.
   */
  public void setSkipEntryCriteria(Boolean skipEntryCriteria) {}

  /**
   * Sets the user ID of the submitter requesting the approval record. The user must be one of the allowed submitters in the process definition setup. If you don’t set a submitter ID, the process uses the current user as the submitter.
   * @param userID The user ID on behalf of which the record is submitted. If set to null , the current user is the submitter. If the submitter is not set with this method, the default submitter is null (the current user).
   */
  public void setSubmitterId(String userID) {}

}