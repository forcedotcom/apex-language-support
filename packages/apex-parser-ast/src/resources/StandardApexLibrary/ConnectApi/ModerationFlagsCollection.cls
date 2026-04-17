/**
 * A collection of flags on a feed item, comment, or file.
 */
global class ModerationFlagsCollection {

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * List of flag details.
   */
  global List < ConnectApi.ModerationFlagItemDetail > flags;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Number of items per page.
   */
  global Integer pageSize;

}