/**
 * A list of Chatter, custom, and static recommendations.
 */
global class RecommendationCollection {

  global RecommendationCollection() {}

  /**
   * Collection of Chatter, custom, and static recommendations.
   */
  global List < ConnectApi.AbstractRecommendation > recommendations;

  global Object clone() {}

}