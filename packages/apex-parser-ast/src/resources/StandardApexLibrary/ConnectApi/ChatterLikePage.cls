/**
 * Page of Chatter likes.
 */
global class ChatterLikePage {

  /**
   * Token identifying the current page.
   */
  global Integer currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of likes.
   */
  global List < ConnectApi.ChatterLike > items;

  /**
   * List of likes. Important As of API version 32.0, use the items property.
   */
  global List < ConnectApi.ChatterLike > likes;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global Integer nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page, or null if there isn’t a previous page.
   */
  global Integer previousPageToken;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of likes across all pages.
   */
  global Integer total;

}