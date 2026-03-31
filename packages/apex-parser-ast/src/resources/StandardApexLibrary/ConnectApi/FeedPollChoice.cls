/**
 * Feed poll choice.
 */
global class FeedPollChoice {

  /**
   * Poll choice ID.
   */
  global String id;

  /**
   * The location in the poll where this poll choice exists. The first poll choice starts at 1.
   */
  global Integer position;

  /**
   * Label text associated with the poll choice.
   */
  global String text;

  /**
   * Total number of votes for this poll choice.
   */
  global Integer voteCount;

  /**
   * The ratio of total number of votes for this poll choice to all votes cast in the poll. Multiply the ratio by 100 to get the percentage of votes cast for this poll choice.
   */
  global Double voteCountRatio;

}