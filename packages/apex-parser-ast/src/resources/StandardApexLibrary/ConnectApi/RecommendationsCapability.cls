/**
 * If a feed element has this capability, it has a recommendation.
 */
global class RecommendationsCapability extends ConnectApi.FeedElementCapability {

  global RecommendationsCapability() {}

  /**
   * A list of recommendations.
   */
  global List < ConnectApi.AbstractRecommendation > items;

  global Object clone() {}

}