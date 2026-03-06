/**
 * Change the status of a feed post or comment.
 */
global class StatusCapabilityInput {

  /**
   * Status of the feed post or comment. Values are: Draft —The feed post isn’t published but is visible to the author and users with Modify All Data or View All Data permission. Comments can’t be drafts. Isolated —The feed post or comment is isolated, and only admins can see it. PendingReview —The feed post or comment isn’t approved yet and therefore isn’t published or visible. Published —The feed post or comment is approved and visible. Posts that have a status of PendingReview or Published can’t be changed to a status of Draft and vice versa. Only admins can change the status of a post or comment to or from Isolated status.
   */
  global ConnectApi.FeedEntityStatus feedEntityStatus;

}