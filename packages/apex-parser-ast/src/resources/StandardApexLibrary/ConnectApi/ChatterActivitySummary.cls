/**
 * Summary of Chatter activity.
 */
global class ChatterActivitySummary {

  /**
   * Total number of comments in the org or site made by the user.
   */
  global Integer commentCount;

  /**
   * Total number of comments in the org or site received by the user.
   */
  global Integer commentReceivedCount;

  /**
   * Total number of likes and upvotes (in version 45.0 and later) on posts and comments in the org or site received by the user.
   */
  global Integer likeReceivedCount;

  /**
   * Total number of posts in the org or site made by the user.
   */
  global Integer postCount;

}