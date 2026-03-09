/**
 * Create or update a bookmark on a feed element.
 */
global class BookmarksCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  /**
   * Specifies if the feed element should be bookmarked for the user ( true ) or not ( false ).
   */
  global Boolean isBookmarkedByCurrentUser;

}