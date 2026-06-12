/**
 * Include a link segment in a feed item or comment.
 */
global class LinkSegmentInput extends ConnectApi.MessageSegmentInput {

  global LinkSegmentInput() {}

  /**
   * URL to be used for the link
   */
  global String url;

  global Object clone() {}

}