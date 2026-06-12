/**
 * Create or update a link on a feed element.
 */
global class LinkCapabilityInput extends ConnectApi.FeedElementCapabilityInput {

  global LinkCapabilityInput() {}

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