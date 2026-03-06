/**
 * Calculated insight collection data.
 */
global class CdpCalculatedInsightPageData {

  /**
   * Number of results returned in the page.
   */
  global Integer count;

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of calculated insights.
   */
  global List < ConnectApi.CdpCalculatedInsightOutput > items;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageToken;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total row count of calculated insights.
   */
  global Integer total;

}