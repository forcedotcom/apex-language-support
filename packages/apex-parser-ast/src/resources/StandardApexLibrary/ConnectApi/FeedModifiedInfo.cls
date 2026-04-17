/**
 * Feed modified information.
 */
global class FeedModifiedInfo {

  /**
   * true if the news feed has been modified since the last time it was polled; false otherwise. Returns null if the feed is not a news feed.
   */
  global Boolean isModified;

  /**
   * Opaque polling token to use in the since parameter of the ChatterFeeds.isModified method. The token describes when the feed was last modified.
   */
  global String isModifiedToken;

  /**
   * Connect REST API URL with a since request parameter that contains an opaque token that describes when the feed was last modified. Returns null if the feed isn’t a news feed. Use this URL to poll a news feed for updates.
   */
  global String nextPollUrl;

}