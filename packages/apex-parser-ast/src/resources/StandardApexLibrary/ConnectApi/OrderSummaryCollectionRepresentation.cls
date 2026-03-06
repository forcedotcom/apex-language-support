/**
 * Collection of order summaries.
 */
global class OrderSummaryCollectionRepresentation {

  /**
   * Total count of order summaries returned on the current page.
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
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Collection of order summaries.
   */
  global List < ConnectApi.OrderSummaryRepresentation > orderSummaries;

  /**
   * Token identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageToken;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Sort order for order summaries. Values are: CreatedDateAsc —Sorts by the oldest created date. CreatedDateDesc —Sorts by the most recent created date. OrderedDateAsc —Sorts by the oldest ordered date. OrderedDateDesc —Sorts by the most recent ordered date.
   */
  global ConnectApi.OrderSummarySortOrder sortOrder;

}