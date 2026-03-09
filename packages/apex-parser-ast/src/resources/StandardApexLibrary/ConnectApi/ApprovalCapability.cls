/**
 * If a feed element has this capability, it includes information about an approval.
 */
global class ApprovalCapability extends ConnectApi.FeedElementCapability {

  /**
   * The work item ID. The work item ID is null if there isn’t a pending work item associated with the approval record.
   */
  global String id;

  /**
   * The details of the approval post template field.
   */
  global List < ConnectApi.ApprovalPostTemplateField > postTemplateFields;

  /**
   * The process instance step ID. The associated record represents one step in an approval process.
   */
  global String processInstanceStepId;

  /**
   * The status of the approval.
   */
  global ConnectApi.WorkflowProcessStatus status;

}