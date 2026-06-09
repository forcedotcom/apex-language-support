/**
 * Represents an inbound email object.
 */
global class InboundEmail {

  global InboundEmail() {}

  global AuthenticationResult[] authenticationResults;

  global BinaryAttachment[] binaryAttachments;

  global String[] ccAddresses;

  global String fromAddress;

  global String fromName;

  global Header[] headers;

  global String htmlBody;

  global Boolean htmlBodyIsTruncated;

  global String inReplyTo;

  global String messageId;

  global String plainTextBody;

  global Boolean plainTextBodyIsTruncated;

  global String[] references;

  global String replyTo;

  global String subject;

  global TextAttachment[] textAttachments;

  global String[] toAddresses;

  global Object clone() {}

  /**
   * Contains the authentication type and response for inbound emails.
   */
  global class AuthenticationResult {

    global AuthenticationResult() {}

    global InboundEmail.AuthenticationResultField[] authenticationResultFields;

    global String method;

    global String result;

    global Object clone() {}

  }

  /**
   * Contains field data from the authentication result response for inbound emails.
   */
  global class AuthenticationResultField {

    global AuthenticationResultField() {}

    global String name;

    global String value;

    global Object clone() {}

  }

  /**
   * An InboundEmail object stores binary attachments in an InboundEmail.BinaryAttachment object.
   */
  global class BinaryAttachment {

    global BinaryAttachment() {}

    global Blob body;

    global String fileName;

    global String mimeTypeSubType;

    global Object clone() {}

  }

  /**
   * An InboundEmail object stores text attachments in an InboundEmail.TextAttachment object.
   */
  global class TextAttachment {

    global TextAttachment() {}

    global String body;

    global Boolean bodyIsTruncated;

    global String charset;

    global String fileName;

    global List<Messaging.InboundEmail.Header> headers;

    global String mimeTypeSubType;

    global Object clone() {}

  }

  /**
   * An InboundEmail object stores RFC 2822 email header information in an InboundEmail.Header object with the following properties.
   */
  global class Header {

    global Header() {}

    global String name;

    global String value;

    global Object clone() {}

  }

}