/**
 * Orchestration instance.
 */
global class OrchestrationInstance {

  /**
   * Developer name of the flow definition.
   */
  global String flowDefinitionDeveloperName;

  /**
   * ID of the flow definition.
   */
  global String flowDefinitionId;

  /**
   * Name of the flow definition.
   */
  global String flowDefinitionName;

  /**
   * ID of the orchestration instance.
   */
  global String id;

  /**
   * ID of the interview to resume.
   */
  global String interviewId;

  /**
   * Orchestration stage instances.
   */
  global List < ConnectApi.OrchestrationStageInstance > stageInstances;

  /**
   * Status of the orchestration instance. Values are: Canceled Completed Discontinued Error InProgress NotStarted Suspended
   */
  global ConnectApi.OrchestrationStatus status;

}