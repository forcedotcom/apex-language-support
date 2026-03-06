/**
 * An announcement.
 */
global class AnnouncementInput {

  /**
   * Text of the announcement.
   */
  global ConnectApi.MessageBodyInput body;

  /**
   * The Salesforce UI displays an announcement until 11:59 p.m. on this date unless another announcement is posted first. The Salesforce UI ignores the time value in the expirationDate . However, you can use the time value to create your own display logic in your own UI.
   */
  global Datetime expirationDate;

  /**
   * ID of an AdvancedTextPost feed item that is the body of the announcement.
   */
  global String feedItemId;

  /**
   * Specifies whether the announcement is archived.
   */
  global Boolean isArchived;

  /**
   * ID of the parent entity for the announcement, that is, a group ID when the announcement appears in a group.
   */
  global String parentId;

  /**
   * Specifies whether the announcement is sent as an email to all group members regardless of their email setting for the group. If Chatter emails aren’t enabled for the organization, announcement emails aren’t sent. Default value is false .
   */
  global Boolean sendEmails;

}