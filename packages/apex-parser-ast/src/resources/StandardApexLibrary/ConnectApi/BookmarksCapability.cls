/**
 * If a feed element has this capability, the context user can bookmark it.
 */
global class BookmarksCapability extends ConnectApi.FeedElementCapability {

  /**
   * Indicates whether the feed element has been bookmarked by the context user ( true ) or not ( false ).
   */
  global Boolean isBookmarkedByCurrentUser;

}