/**
 * Page of followers.
 */
global class FollowerPage {

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of subscriptions.
   */
  global List < ConnectApi.Subscription > followers;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of followers across all pages.
   */
  global Integer total;

}