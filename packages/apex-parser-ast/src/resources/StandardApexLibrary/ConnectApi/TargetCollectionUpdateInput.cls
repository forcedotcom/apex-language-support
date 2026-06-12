/**
 * Collection of targets to update.
 */
global class TargetCollectionUpdateInput {

  global TargetCollectionUpdateInput() {}

  /**
   * List of targets to update.
   */
  global List < ConnectApi.TargetUpdateInput > targets;

  global Object clone() {}

}