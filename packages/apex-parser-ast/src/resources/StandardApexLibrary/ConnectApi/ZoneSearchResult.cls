/**
 * Information about a specific zone search result.
 */
global class ZoneSearchResult {

  /**
   * Indicates if the search result has a best answer.
   */
  global Boolean hasBestAnswer;

  /**
   * ID of the search result. The search result can be a question or an article.
   */
  global String id;

  /**
   * Title of the search result.
   */
  global String title;

  /**
   * Specifies the zone search result type. Article —Search results contain only articles. Question —Search results contain only questions.
   */
  global ConnectApi.ZoneSearchResultType Enum type;

  /**
   * Number of votes given to the search result.
   */
  global String voteCount;

}