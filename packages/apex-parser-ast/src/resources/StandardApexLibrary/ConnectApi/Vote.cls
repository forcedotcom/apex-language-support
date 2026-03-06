/**
 * An upvote or downvote on a feed element or comment.
 */
global class Vote {

  /**
   * Type of vote for a feed element or comment. Down Up
   */
  global ConnectApi.UpDownVoteValue type;

  /**
   * User who voted on the feed element or comment.
   */
  global ConnectApi.UserSummary user;

  /**
   * Reference to the feed element or comment that was voted on.
   */
  global ConnectApi.Reference votedItem;

}