/**
 * Collection of order delivery group summaries.
 */
global class OrderDeliveryGroupSummaryCollection {

  /**
   * Token identifying the current page of order delivery group summaries.
   */
  global String currentPageToken;

  /**
   * URL to the current page of order delivery group summaries.
   */
  global String currentPageUrl;

  /**
   * Token identifying the next page of order delivery group summaries.
   */
  global String nextPageToken;

  /**
   * URL to the next page of order delivery group summaries.
   */
  global String nextPageUrl;

  /**
   * Collection of order delivery group summaries.
   */
  global List < ConnectApi.OrderDeliveryGroupSummary > orderDeliveryGroups;

  /**
   * Token identifying previous page of order delivery group summaries.
   */
  global String previousPageToken;

  /**
   * URL to the previous page of order delivery group summaries.
   */
  global String previousPageUrl;

}