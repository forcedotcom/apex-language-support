/**
 * A reaction to a recommendation produced by a recommendation strategy
 */
global class RecommendationReaction {

  /**
   * Reserved for future use.
   */
  global String aiModel;

  /**
   * Reference to the context record.
   */
  global ConnectApi.Reference contextRecord;

  /**
   * Reference to the reaction creator.
   */
  global ConnectApi.Reference createdBy;

  /**
   * Reaction creation date.
   */
  global Datetime createdDate;

  /**
   * External target ID of the recommendation reacted on. This ID doesn’t need to be a Salesforce 18-character ID. For example, it can be a product number from an external system.
   */
  global String externalId;

  /**
   * Reaction record ID.
   */
  global String id;

  /**
   * Reference to the user or record that is indirectly reacting to the recommendation.
   */
  global ConnectApi.Reference onBehalfOf;

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
   * Strategy that recommended the target record.
   */
  global ConnectApi.RecordSnapshot strategy;

  /**
   * Target action that is recommended.
   */
  global ConnectApi.RecordSnapshot targetAction;

  /**
   * Reference to the target record.
   */
  global ConnectApi.Reference targetRecord;

  /**
   * URL to the recommendation reaction.
   */
  global String url;

}