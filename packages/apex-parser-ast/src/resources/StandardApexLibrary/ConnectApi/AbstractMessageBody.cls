/**
 * Abstract message body.
 */
global class AbstractMessageBody {

  /**
   * Indicates whether the body is rich text.
   */
  global Boolean isRichText;

  /**
   * List of message segments
   */
  global List < ConnectApi.MessageSegment > messageSegments;

  /**
   * Display-ready text. Use this text if you don’t want to process the message segments.
   */
  global String text;

}