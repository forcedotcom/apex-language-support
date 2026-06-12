/**
 * Email address.
 */
global class EmailAddress {

  global EmailAddress() {}

  /**
   * The display name for the email address.
   */
  global String displayName;

  /**
   * The email address.
   */
  global String emailAddress;

  /**
   * The summary of a related record, for example, a contact or user summary.
   */
  global ConnectApi.RecordSummary relatedRecord;

  global Object clone() {}

}