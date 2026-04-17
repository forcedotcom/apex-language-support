/**
 * If a feed element has this capability, it has a link that may contain supplemental information like an icon, a title, and a description.
 */
global class EnhancedLinkCapability extends ConnectApi.FeedElementCapability {

  /**
   * A description with a 500 character limit.
   */
  global String description;

  /**
   * A icon.
   */
  global ConnectApi.Icon icon;

  /**
   * A ID associated with the link if the link URL refers to a Salesforce record.
   */
  global String linkRecordId;

  /**
   * A link URL to a detail page if available content can’t display inline.
   */
  global String linkUrl;

  /**
   * A title to a detail page.
   */
  global String title;

}