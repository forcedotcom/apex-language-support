/**
 * Attachment of ConnectApi.FeedItem objects where the type property is PollPost .
 */
global class FeedPoll {

  /**
   * List of choices for poll.
   */
  global List < ConnectApi.FeedPollChoice > choices;

  /**
   * ID of the poll choice that the context user has voted for in this poll. Returns null if the context user hasn’t voted.
   */
  global String myChoiceId;

  /**
   * Total number of votes cast on the feed poll item.
   */
  global Integer totalVoteCount;

}