/**
 * Create, update, or vote on a poll on a feed element.
 */
global class PollCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  /**
   * The choices used to create a new poll. You must specify 2–10 poll choices for each poll.
   */
  global List < String > choices;

  /**
   * ID of an existing choice on the feed poll. Used to vote on an existing poll.
   */
  global String myChoiceId;

}