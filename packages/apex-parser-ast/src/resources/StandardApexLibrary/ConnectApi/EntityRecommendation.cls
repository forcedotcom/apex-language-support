/**
 * A Chatter, custom, or static recommendation.
 */
global class EntityRecommendation {

  /**
   * For user, file, group, topic, and record entity types, use this Connect REST URL with a POST request to take action on the recommendation. For ConnectApi.RecommendedObject entity types, such as custom recommendations, use the actionUrl property of the ConnectApi.PlatformAction to take action on the recommendation.
   */
  global String actOnUrl;

  /**
   * Specifies the action to take on a recommendation. follow —Follow a file, record, topic, or user. join —Join a group. view —View a file, group, article, record, user, custom, or static recommendation.
   */
  global ConnectApi.RecommendationActionType action;

  /**
   * The entity with which the receiver is recommended to take action.
   */
  global ConnectApi.Actor entity;

}