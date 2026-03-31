/**
 * A container for all capabilities that can be included with a comment.
 */
global class CommentCapabilitiesInput {

  /**
   * Content to attach to the comment.
   */
  global ConnectApi.ContentCapabilityInput content;

  /**
   * Feed entity to share to the comment.
   */
  global ConnectApi.FeedEntityShareCapabilityInput feedEntityShare;

  /**
   * Existing knowledge article to attach to the comment.
   */
  global ConnectApi.RecordCapabilityInput record;

}