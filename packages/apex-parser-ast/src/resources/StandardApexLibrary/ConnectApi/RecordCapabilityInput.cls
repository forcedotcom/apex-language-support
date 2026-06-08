/**
 * Attach an existing knowledge article to a comment.
 */
global class RecordCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  global RecordCapabilityInput() {}

  /**
   * ID of the existing knowledge article to attach.
   */
  global String recordId;

  global Object clone() {}

}