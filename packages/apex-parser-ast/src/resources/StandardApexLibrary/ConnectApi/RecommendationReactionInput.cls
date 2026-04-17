/**
 * A reaction to a recommendation produced by a recommendation strategy.
 */
global class RecommendationReactionInput {

  /**
   * Reserved for future use.
   */
  global String aiModel;

  /**
   * ID of the context record. For example, if the next best action is on a case detail page, the ID of the case.
   */
  global String contextRecordId;

  /**
   * ID of the original recommendation strategy execution.
   */
  global String executionId;

  /**
   * External ID of the recommendation. This ID doesn’t need to be a Salesforce 18-character ID. For example, it can be a product number from an external system.
   */
  global String externalId;

  /**
   * ID of the user or entity for which the reaction took place.
   */
  global String onBehalfOfId;

  /**
   * Type of reaction to a recommendation. Values are: Accepted Rejected
   */
  global ConnectApi.RecommendationReactionType reactionType;

  /**
   * Reserved for future use.
   */
  global String recommendationMode;

  /**
   * Reserved for future use.
   */
  global Double recommendationScore;

  /**
   * Name of the recommendation strategy.
   */
  global String strategyName;

  /**
   * ID of the target action.
   */
  global String targetActionId;

  /**
   * Name of the target action.
   */
  global String targetActionName;

  /**
   * ID of the recommendation that is being reacted to.
   */
  global String targetId;

}