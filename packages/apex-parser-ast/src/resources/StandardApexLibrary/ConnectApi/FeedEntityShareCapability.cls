/**
 * If a feed element or comment has this capability, a feed entity is shared with it.
 */
global class FeedEntityShareCapability extends ConnectApi.FeedElementCapability {

  global FeedEntityShareCapability() {}

  /**
   * The summary of the feed entity that is shared with the feed element or comment.
   */
  global ConnectApi.FeedEntitySummary feedEntity;

  global Object clone() {}

}