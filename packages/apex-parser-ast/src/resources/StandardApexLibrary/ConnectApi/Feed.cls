/**
 * Chatter feed.
 */
global class Feed {

  /**
   * Connect REST API URL to post feed elements to this subject.
   */
  global String feedElementPostUrl;

  /**
   * Page of feed elements for the feed specified in redirectedFeedType . Otherwise, null .
   */
  global ConnectApi.FeedElementPage feedElements;

  /**
   * Connect REST API URL to feed elements.
   */
  global String feedElementsUrl;

  /**
   * Connect REST API URL to feed items.
   */
  global String feedItemsUrl;

  /**
   * Connect REST API URL with a since request parameter that contains an opaque token that describes when the feed was last modified. Returns null if the feed isn’t a news feed. Use this URL to poll a news feed for updates. Important This feature is available through a Feed Polling pilot program. This pilot program is closed and not accepting new participants.
   */
  global String isModifedUrl;

  /**
   * URL to pinned feed items.
   */
  global String pinnedFeedElementsUrl;

  /**
   * Filter for the feed specified in redirectedFeedType . Otherwise, null .
   */
  global ConnectApi.FeedFilter redirectedFeedFilter;

  /**
   * Sort order for the feed specified in redirectedFeedType . Otherwise, null .
   */
  global ConnectApi.FeedSortOrder redirectedFeedSort;

  /**
   * Specifies which feed is returned if pageSize is specified. Otherwise, null .
   */
  global ConnectApi.FeedType redirectedFeedType;

  /**
   * Indicates whether the feed respects the mute feature. If true , the feed shows the ability to mute or unmute each element, depending on the value of isMutedByMe ; null if the mute feature is disabled for the organization.
   */
  global Boolean respectsMute;

}