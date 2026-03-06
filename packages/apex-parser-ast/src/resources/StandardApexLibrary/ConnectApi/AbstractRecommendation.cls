/**
 * A Chatter, custom, or static recommendation.
 */
global class AbstractRecommendation {

  /**
   * The Chatter, custom, or static recommendation explanation.
   */
  global ConnectApi.RecommendationExplanation explanation;

  /**
   * A platform action group instance with state appropriate for the context user.
   */
  global ConnectApi.PlatformActionGroup platformActionGroup;

  /**
   * Specifies the type of record being recommended.
   */
  global ConnectApi.RecommendationType recommendationType;

  /**
   * URL for the Chatter, custom, or static recommendation.
   */
  global String url;

}