/**
 * A record the user is recommended to take action on.
 */
global class NBANativeRecommendation extends ConnectApi.AbstractNBATarget {

  /**
   * ID of the recommendation.
   */
  global String id;

  /**
   * Name of the recommendation.
   */
  global String name;

  /**
   * URL to the recommendation.
   */
  global String url;

}