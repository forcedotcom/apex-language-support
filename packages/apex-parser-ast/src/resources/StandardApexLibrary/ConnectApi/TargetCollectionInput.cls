/**
 * Collection of targets to create.
 */
global class TargetCollectionInput {

  global TargetCollectionInput() {}

  /**
   * List of targets to create.
   */
  global List < ConnectApi.TargetInput > targets;

  global Object clone() {}

}