/**
 * Upvote or downvote a feed element or a comment.
 */
global class UpDownVoteCapabilityInput {

  global UpDownVoteCapabilityInput() {}

  /**
   * Type of vote for a feed element or comment. Values are: Down None Up
   */
  global ConnectApi.UpDownVoteValue vote;

  global Object clone() {}

}