/**
 * Target assignments for a personalization audience.
 */
global class AudienceTargetAssignment {

  /**
   * Formula scope of the target.
   */
  global ConnectApi.FormulaScope formulaScope;

  /**
   * Group name of the target. Groups bundle related target and audience pairs.
   */
  global String groupName;

  /**
   * ID of the target.
   */
  global String id;

  /**
   * Specifies whether the target matches the current context ( true ) or doesn’t ( false ).
   */
  global Boolean isMatch;

  /**
   * Priority of the target. Within a group, priority determines which target is returned if the user matches more than one audience.
   */
  global Integer priority;

  /**
   * Publish status of the target. Values are: Draft Live
   */
  global ConnectApi.PublishStatus publishStatus;

  /**
   * Type of target, indicating the nature of the data being targeted.
   */
  global String targetType;

  /**
   * Value of the target.
   */
  global String targetValue;

  /**
   * URL to the target.
   */
  global String url;

}