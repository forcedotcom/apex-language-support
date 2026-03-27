/**
 * An announcement displays in a designated location in the Salesforce UI until 11:59 p.m. on its expiration date, unless it’s deleted or replaced by another announcement.
 */
global class Announcement {

  /**
   * The Salesforce UI displays an announcement until 11:59 p.m. on this date unless another announcement is posted first. The Salesforce UI ignores the time value in the expirationDate . However, you can use the time value to create your own display logic in your own UI.
   */
  global Datetime expirationDate;

  /**
   * The feed element that contains the body of the announcement and its associated comments, likes, and so on.
   */
  global ConnectApi.FeedElement feedElement;

  /**
   * 18-character ID of the announcement.
   */
  global String id;

  /**
   * Specifies whether the announcement is archived.
   */
  global Boolean isArchived;

  /**
   * Specifies whether the announcement is sent as an email to all group members.
   */
  global Boolean sendEmails;

  /**
   * The URL to the announcement.
   */
  global String url;

}