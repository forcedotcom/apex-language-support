/**
 * If a feed post or comment has this capability, users can upvote or downvote it.
 */
global class UpDownVoteCapability extends ConnectApi.FeedElementCapability {

  /**
   * Number of downvotes.
   */
  global Long downVoteCount;

  /**
   * Specifies the context user’s vote. Values are: Down None Up
   */
  global ConnectApi.UpDownVoteValue myVote;

  /**
   * Number of upvotes.
   */
  global Long upVoteCount;

}