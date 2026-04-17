/**
 * Orchestration stage instance.
 */
global class OrchestrationStageInstance {

  /**
   * The duration of the stage in seconds.
   */
  global String completionTime;

  /**
   * ID of the orchestration stage instance.
   */
  global String id;

  /**
   * Orchestration stage instance label.
   */
  global String label;

  /**
   * Orchestration stage instance name.
   */
  global String name;

  /**
   * Status of the orchestration instance. Values are: Canceled Completed Discontinued Error InProgress NotStarted Suspended
   */
  global ConnectApi.OrchestrationStatus status;

  /**
   * Orchestration stage instance steps.
   */
  global List < ConnectApi.OrchestrationStepInstance > stepInstances;

}