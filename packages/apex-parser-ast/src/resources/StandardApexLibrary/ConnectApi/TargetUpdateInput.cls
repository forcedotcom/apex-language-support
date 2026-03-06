/**
 * Target to update.
 */
global class TargetUpdateInput {

  /**
   * ID of the audience to assign to the target.
   */
  global String audienceId;

  /**
   * Priority of the target. Within a group, priority determines which target is returned if the user matches more than one audience.
   */
  global Integer priority;

  /**
   * ID of the target to update.
   */
  global String targetId;

}