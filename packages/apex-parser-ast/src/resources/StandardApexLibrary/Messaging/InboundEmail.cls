/**
 * Represents an inbound email object.
 */
global class InboundEmail {

  global InboundEmail() {}

  public AuthenticationResult[] authenticationResults;

  public BinaryAttachment[] binaryAttachments;

  public String[] ccAddresses;

  public String fromAddress;

  public String fromName;

  public Header[] headers;

  public String htmlBody;

  public Boolean htmlBodyIsTruncated;

  public String inReplyTo;

  public String messageId;

  public String plainTextBody;

  public Boolean plainTextBodyIsTruncated;

  public String[] references;

  public String replyTo;

  public String subject;

  public TextAttachment[] textAttachments;

  public String[] toAddresses;

  global Object clone() {}

  /**
   * Contains the authentication type and response for inbound emails.
   */
  global class AuthenticationResult {

    global AuthenticationResult() {}

    public InboundEmail.AuthenticationResultField[] authenticationResultFields;

    public String method;

    public String result;

    global Object clone() {}

  }

  /**
   * Contains field data from the authentication result response for inbound emails.
   */
  global class AuthenticationResultField {

    global AuthenticationResultField() {}

    public String name;

    public String value;

    global Object clone() {}

  }

  /**
   * An InboundEmail object stores binary attachments in an InboundEmail.BinaryAttachment object.
   */
  global class BinaryAttachment {

    global BinaryAttachment() {}

    public Blob body;

    public String fileName;

    public String mimeTypeSubType;

    global Object clone() {}

  }

  /**
   * An InboundEmail object stores text attachments in an InboundEmail.TextAttachment object.
   */
  global class TextAttachment {

    global TextAttachment() {}

    public String body;

    public Boolean bodyIsTruncated;

    public String charset;

    public String fileName;

    public List<Messaging.InboundEmail.Header> headers;

    public String mimeTypeSubType;

    global Object clone() {}

  }

  /**
   * An InboundEmail object stores RFC 2822 email header information in an InboundEmail.Header object with the following properties.
   */
  global class Header {

    global Header() {}

    public String name;

    public String value;

    global Object clone() {}

  }

}