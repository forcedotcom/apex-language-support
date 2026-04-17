/**
 * If a feed element has this capability, it has an email message from a case.
 */
global class EmailMessageCapability extends ConnectApi.FeedElementCapability {

  /**
   * Attachments in the email message.
   */
  global List < ConnectApi.EmailAttachment > attachments;

  /**
   * Automation type of the email message. aiAssisted —The email message was created with the assistance of AI. aiAutomated —The email message was created automatically by AI.
   */
  global String automationType;

  /**
   * BCC addresses for the email message.
   */
  global List < ConnectApi.EmailAddress > bccAddresses;

  /**
   * Body of the email message.
   */
  global String body;

  /**
   * CC addresses for the email message.
   */
  global List < ConnectApi.EmailAddress > ccAddresses;

  /**
   * Direction of the email message. Values are: Inbound —An inbound message (sent by a customer). Outbound —An outbound message (sent to a customer by a support agent).
   */
  global ConnectApi.EmailMessageDirection direction;

  /**
   * ID of the email message.
   */
  global String emailMessageId;

  /**
   * Size of a case’s email message HTML body. Large — UseLargeHtmlBody permission is set, HTML body exceeds 131K characters, and HTML email display is enabled. Normal —Email message doesn’t meet the Large criteria.
   */
  global ConnectApi.EmailMessageSize emailSize;

  /**
   * From address for the email message.
   */
  global ConnectApi.EmailAddress fromAddress;

  /**
   * Start location of previous email thread.
   */
  global Integer htmlExpandEmailThread;

  /**
   * Indicates whether the body of the email message is in rich text format.
   */
  global Boolean isRichText;

  /**
   * Status of an email message on a case. Values are: DraftStatus ForwardedStatus NewStatus ReadStatus RepliedStatus SentStatus
   */
  global ConnectApi.EmailMessageStatus status;

  /**
   * Subject of the email message.
   */
  global String subject;

  /**
   * Body of the email message. Important In version 36.0 and later, use the body property.
   */
  global String textBody;

  /**
   * To addresses of the email message.
   */
  global List < ConnectApi.EmailAddress > toAddresses;

  /**
   * Total number of attachments in the email message.
   */
  global Integer totalAttachments;

}