/**
 * Used to attach existing content to a comment or feed item.
 */
global class ContentAttachmentInput extends ConnectApi.FeedItemAttachmentInput {

  global ContentAttachmentInput() {}

  /**
   * ID of the existing content.
   */
  global String contentDocumentId;

  global Object clone() {}

}