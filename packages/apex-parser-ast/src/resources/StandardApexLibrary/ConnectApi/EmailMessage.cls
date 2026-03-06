/**
 * Email message from a case.
 */
global class EmailMessage {

  /**
   * The direction of the email message. Inbound —An inbound message (sent by a customer). Outbound —An outbound message (sent to a customer by a support agent).
   */
  global ConnectApi.EmailMessageDirection Enum direction;

  /**
   * The ID of the email message.
   */
  global String emailMessageId;

  /**
   * The subject of the email message.
   */
  global String subject;

  /**
   * The body of the email message.
   */
  global String textBody;

  /**
   * A list of email addresses to send the message to.
   */
  global List < ConnectApi.EmailAddress > toAddresses;

}