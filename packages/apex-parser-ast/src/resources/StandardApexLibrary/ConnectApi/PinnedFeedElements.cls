/**
 * List of pinned feed elements for a feed.
 */
global class PinnedFeedElements {

  /**
   * List of pinned feed elements. Note In the UI, pinned feed elements don’t show all auxiliary information, such as comments, likes, interaction counts, or read by information. As a result, the ConnectApi.PinnedFeedElements output class doesn’t include all the information for these capabilities.
   */
  global List < ConnectApi.FeedElement > elements;

}