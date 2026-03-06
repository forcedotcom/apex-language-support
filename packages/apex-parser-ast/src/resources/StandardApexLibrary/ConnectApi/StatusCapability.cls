/**
 * If a feed post or comment has this capability, it has a status that determines its visibility.
 */
global class StatusCapability {

  /**
   * Status of the feed post or comment. Values are: Draft —The feed post isn’t published but is visible to the author and users with Modify All Data or View All Data permission. Comments can’t be drafts. Isolated —The feed post or comment is isolated, and only admins can see it. PendingReview —The feed post or comment isn’t approved yet and therefore isn’t published or visible. Published —The feed post or comment is approved and visible.
   */
  global ConnectApi.FeedEntityStatus feedEntityStatus;

  /**
   * Specifies whether the context user can change the status of the feed post or comment.
   */
  global Boolean isApprovableByMe;

}