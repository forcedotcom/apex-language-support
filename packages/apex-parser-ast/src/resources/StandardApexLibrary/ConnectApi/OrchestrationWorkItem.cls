/**
 * Orchestration work item.
 */
global class OrchestrationWorkItem {

  /**
   * ID of the assignee for the orchestration work item.
   */
  global String assigneeId;

  /**
   * Date when the orchestration work item was created.
   */
  global Datetime createdDate;

  /**
   * Description of the orchestration work item.
   */
  global String description;

  /**
   * Flow type of the orchestration that created the orchestration work item.
   */
  global String flowType;

  /**
   * ID of the orchestration work item.
   */
  global String id;

  /**
   * Label key for the orchestration work item.
   */
  global String label;

  /**
   * Date when the work item was last modified.
   */
  global Datetime lastModifiedDate;

  /**
   * ID of the record the orchestration work item is related to.
   */
  global String relatedRecordId;

  /**
   * Developer name of the screen flow to start when assignees work on the orchestration work item.
   */
  global String screenFlowDeveloperName;

  /**
   * ID of the screen flow to start when assignees work on the orchestration work item.
   */
  global String screenFlowId;

  /**
   * Input parameters for the screen flow.
   */
  global String screenFlowInputs;

  /**
   * Status of the orchestration work item. Values are: Assigned Completed
   */
  global ConnectApi.OrchestrationWorkItemStatus status;

}