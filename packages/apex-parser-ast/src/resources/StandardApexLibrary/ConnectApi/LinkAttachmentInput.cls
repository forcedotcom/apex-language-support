/**
 * Add links to a feed item.
 */
global class LinkAttachmentInput extends ConnectApi.FeedItemAttachmentInput {

  global LinkAttachmentInput() {}

  /**
   * URL to be used for the link
   */
  global String url;

  /**
   * Title of the link
   */
  global String urlName;

  global Object clone() {}

}