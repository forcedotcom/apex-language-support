/**
 * Link attached to a feed item.
 */
global class LinkAttachment extends ConnectApi.FeedItemAttachment {

  global LinkAttachment() {}

  /**
   * Title given to the link if available, otherwise, null .
   */
  global String title;

  /**
   * The link URL.
   */
  global String url;

  global Object clone() {}

}