/**
 * If a feed element or comment has this capability, the context user can add a comment to it.
 */
global class CommentsCapability extends ConnectApi.FeedElementCapability {

  /**
   * The comments information for this feed element or comment. Threaded comments are supported in version 44.0 and later.
   */
  global ConnectApi.CommentPage page;

}