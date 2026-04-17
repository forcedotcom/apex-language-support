/**
 * An inline image segment.
 */
global class InlineImageSegmentInput extends ConnectApi.MessageSegmentInput {

  /**
   * Alt text for the inline image.
   */
  global String altText;

  /**
   * ID of the inline image file.
   */
  global String fileId;

}