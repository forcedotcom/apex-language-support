/**
 * Orchestration step instance.
 */
global class OrchestrationStepInstance {

  /**
   * The ID of the user, group, or queue that's assigned to a work item.
   */
  global String assignedTo;

  /**
   * The assignee type associated with a work item. Valid values are: Group Invalid Queue User
   */
  global String assigneeType;

  /**
   * The string stored in an output variable with the API name of Comments from a flow called by a completed orchestration step.
   */
  global String comments;

  /**
   * The user ID of the user who completed the work item.
   */
  global String completedBy;

  /**
   * The duration of the step in seconds.
   */
  global String completionTime;

  /**
   * The description associated with the orchestration step.
   */
  global String description;

  /**
   * ID of the orchestration step instance.
   */
  global String id;

  /**
   * Orchestration step instance label.
   */
  global String label;

  /**
   * Orchestration step instance name.
   */
  global String name;

  /**
   * Status of the orchestration instance. Values are: Canceled Completed Discontinued Error InProgress NotStarted Suspended
   */
  global ConnectApi.OrchestrationStatus status;

  /**
   * Type of orchestration step. Values are: AsynchronousBackgroundStep ApprovalStep BackgroundStep InteractiveStep ManagedContentRoleInteractiveStep ManagedContentVariantAutoPublishBackgroundStep ManagedContentVariantAutoUnpublishBackgroundStep ManagedContentVariantSetLockBackgroundStep ManagedContentVariantSetReadyBackgroundStep MuleSoftStep
   */
  global ConnectApi.OrchestrationStepType stepType;

  /**
   * Orchestration step instance work items.
   */
  global List < ConnectApi.OrchestrationWorkItem > workItems;

}