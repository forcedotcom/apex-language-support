/**
 * Personalization target information.
 */
global class Target {

  /**
   * Audience assigned to the target.
   */
  global ConnectApi.AudienceTarget audience;

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
   * Priority of the target. Within a group, priority determines which target is returned if the user matches more than one audience.
   */
  global Integer priority;

  /**
   * Publish status of the target. Values are: Draft Live
   */
  global ConnectApi.PublishStatus publishStatus;

  /**
   * List of scopes for the target. In version 50.0 and later, the formulaScope property returns this information.
   */
  global List < ConnectApi.Scope > scope;

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