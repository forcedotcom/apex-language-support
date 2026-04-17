/**
 * A paged collection of ConnectApi.FeedElement objects.
 */
global class FeedElementPage {

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Collection of feed elements.
   */
  global List < ConnectApi.FeedElement > elements;

  /**
   * Opaque polling token to use in the since parameter of the ChatterFeeds.isModified method. The token describes when the feed was last modified. Important This feature is available through a Feed Polling pilot program. This pilot program is closed and not accepting new participants.
   */
  global String isModifiedToken;

  /**
   * Connect REST API URL with a since request parameter that contains an opaque token that describes when the feed was last modified. Returns null if the feed isn’t a news feed. Use this URL to poll a news feed for updates. Important This feature is available through a Feed Polling pilot program. This pilot program is closed and not accepting new participants.
   */
  global String isModifiedUrl;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * A token to use in a request to the ConnectApi.ChatterFeeds.getFeedElementsUpdatedSince method.
   */
  global String updatesToken;

  /**
   * Connect REST API feed resource containing the feed elements that have been updated since the feed was refreshed. If the feed doesn’t support this feature, the value is null .
   */
  global String updatesUrl;

}