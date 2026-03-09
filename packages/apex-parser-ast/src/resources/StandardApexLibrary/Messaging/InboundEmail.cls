/**
 * Represents an inbound email object.
 */
global class InboundEmail {

  global InboundEmail.AuthenticationResult authenticationResults;

  global InboundEmail.BinaryAttachment binaryAttachments;

  global String ccAddresses;

  global String fromAddress;

  global String fromName;

  global InboundEmail.Header headers;

  global String htmlBody;

  global Boolean htmlBodyIsTruncated;

  global String inReplyTo;

  global String messageId;

  global String plainTextBody;

  global Boolean plainTextBodyIsTruncated;

  global String references;

  global String replyTo;

  global String subject;

  global InboundEmail.TextAttachment textAttachments;

  global String toAddresses;

}