/**
 * An email attachment in an email message.
 */
global class EmailAttachment {

  global EmailAttachment() {}

  /**
   * Record summary of the attachment.
   */
  global ConnectApi.RecordSummary attachment;

  /**
   * Type of attachment.
   */
  global String contentType;

  /**
   * Name of the attachment.
   */
  global String fileName;

  global Object clone() {}

}