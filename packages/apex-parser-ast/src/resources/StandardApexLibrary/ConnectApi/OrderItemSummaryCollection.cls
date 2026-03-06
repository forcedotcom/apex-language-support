/**
 * Collection of order item summaries.
 */
global class OrderItemSummaryCollection {

  /**
   * Token identifying the current page of items.
   */
  global String currentPageToken;

  /**
   * URL to the current page of items.
   */
  global String currentPageUrl;

  /**
   * Collection of order item summaries.
   */
  global List < ConnectApi.OrderItemSummary > items;

  /**
   * Token identifying the next page of items.
   */
  global String nextPageToken;

  /**
   * URL to the next page of items.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page of items.
   */
  global String previousPageToken;

  /**
   * URL to the previous page of items.
   */
  global String previousPageUrl;

}