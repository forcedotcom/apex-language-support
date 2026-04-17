/**
 * A paged collection of ConnectApi.FeedItem objects.
 */
global class FeedItemPage {

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Opaque polling token to use in the since parameter of the ChatterFeeds.isModified method. The token describes when the feed was last modified. Important This feature is available through a Feed Polling pilot program. This pilot program is closed and not accepting new participants.
   */
  global String isModifiedToken;

  /**
   * Connect REST API URL with a since request parameter that contains an opaque token that describes when the feed was last modified. Returns null if the feed isn’t a news feed. Use this URL to poll a news feed for updates. Important This feature is available through a Feed Polling pilot program. This pilot program is closed and not accepting new participants.
   */
  global String isModifiedUrl;

  /**
   * List of feed items
   */
  global List < ConnectApi.FeedItem > items;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Token to use in an updatedSince parameter, or null if not available.
   */
  global String updatesToken;

  /**
   * A Connect REST API resource with a query string containing the value of the updatesToken property. The resource returns the feed items that have been updated since the last request. Use the URL as it is—do not modify it. Property is null if not available.
   */
  global String updatesUrl;

}