/**
 * Page of group summaries.
 */
global class ChatterGroupSummaryPage {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of group summary objects.
   */
  global List < ConnectApi.ChatterGroupSummary > groups;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

}