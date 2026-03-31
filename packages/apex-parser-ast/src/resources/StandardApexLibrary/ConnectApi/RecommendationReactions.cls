/**
 * A list of recommendation reactions.
 */
global class RecommendationReactions {

  /**
   * URL to the current page of reactions in the collection.
   */
  global String currentPageUrl;

  /**
   * URL to the next page of reactions in the collection.
   */
  global String nextPageUrl;

  /**
   * Collection of recommendation reactions.
   */
  global List < ConnectApi.RecommendationReaction > reactions;

}