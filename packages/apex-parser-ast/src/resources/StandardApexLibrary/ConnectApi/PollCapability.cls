/**
 * If a feed element has this capability, it includes a poll.
 */
global class PollCapability extends ConnectApi.FeedElementCapability {

  /**
   * Collection of poll choices that make up the poll.
   */
  global List < ConnectApi.FeedPollChoice > choices;

  /**
   * 18-character ID of the poll choice that the context user has voted for in this poll. Returns null if the context user has not voted.
   */
  global String myChoiceId;

  /**
   * Total number of votes cast on the feed poll element.
   */
  global Integer totalVoteCount;

}