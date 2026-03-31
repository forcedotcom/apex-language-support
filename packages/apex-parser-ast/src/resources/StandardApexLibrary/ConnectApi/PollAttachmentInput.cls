/**
 * Attach a poll to a feed item.
 */
global class PollAttachmentInput extends ConnectApi.FeedItemAttachmentInput {

  /**
   * The text labels for the poll items. Polls must contain between 2 to 10 poll choices.
   */
  global List < String > pollChoices;

}