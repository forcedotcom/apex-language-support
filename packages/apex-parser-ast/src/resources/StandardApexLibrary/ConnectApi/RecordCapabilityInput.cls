/**
 * Attach an existing knowledge article to a comment.
 */
global class RecordCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  /**
   * ID of the existing knowledge article to attach.
   */
  global String recordId;

}