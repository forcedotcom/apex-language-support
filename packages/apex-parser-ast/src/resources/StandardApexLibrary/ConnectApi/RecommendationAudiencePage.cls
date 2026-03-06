/**
 * A list of custom recommendation audiences.
 */
global class RecommendationAudiencePage {

  /**
   * The total number of custom recommendation audiences.
   */
  global Integer audienceCount;

  /**
   * URL to the current page.
   */
  global String currentPageUrl;

  /**
   * URL to the next page.
   */
  global String nextPageUrl;

  /**
   * URL to the previous page.
   */
  global String previousPageUrl;

  /**
   * A list of custom recommendation audiences.
   */
  global List < ConnectApi.RecommendationAudience > recommendationAudiences;

}