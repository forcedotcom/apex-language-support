/**
 * If a feed element has this capability, it has a link.
 */
global class LinkCapability extends ConnectApi.FeedElementCapability {

  global LinkCapability() {}

  /**
   * Link URL. The URL can be to an external site.
   */
  global String url;

  /**
   * Description of the link.
   */
  global String urlName;

  global Object clone() {}

}