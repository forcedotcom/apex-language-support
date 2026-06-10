/**
 * Add rich messages to feed items and comments.
 */
global class MessageBodyInput {

  global MessageBodyInput() {}

  /**
   * List of message segments contained in the body
   */
  global List < ConnectApi.MessageSegmentInput > messageSegments;

  global Object clone() {}

}