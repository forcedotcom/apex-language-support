/**
 * Attachments in feed items with type BasicTemplate .
 */
global class BasicTemplateAttachment extends ConnectApi.FeedItemAttachment {

  /**
   * An optional description with a 500 character limit.
   */
  global String description;

  /**
   * An optional icon.
   */
  global ConnectApi.Icon icon;

  /**
   * If linkURL refers to a Salesforce record, linkRecordId contains the ID of the record.
   */
  global String linkRecordId;

  /**
   * An optional URL to a detail page if there is more content that can’t be displayed inline. Do not specify linkUrl unless you specify a title .
   */
  global String linkUrl;

  /**
   * An optional title to the detail page. If linkUrl is specified, the title links to linkUrl .
   */
  global String title;

}