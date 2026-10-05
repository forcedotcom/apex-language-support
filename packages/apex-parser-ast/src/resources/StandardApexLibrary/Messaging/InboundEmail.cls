/**
 * Represents an inbound email object.
 */
global class InboundEmail {
    /**
     * A list of authentication results received with the email, if any.
     * <p>Usage
     * Examples of authentication results include dkim, dmarc, and spf.
     * <p>InboundEmail.AuthenticationResult[]
     */
    global webservice List authenticationResults;
    /**
     * A list of binary attachments received with the email, if any.
     * <p>Usage
     * Examples of binary attachments include image, audio, application, and video files.
     * <p>InboundEmail.BinaryAttachment[]
     */
    global webservice List binaryAttachments;
    /**
     * A list of carbon copy (CC) addresses, if any.
     * <p>String[]
     */
    global webservice List ccAddresses;
    /**
     * The email address that appears in the From field.
     * <p>String
     */
    global webservice String fromAddress;
    /**
     * The name that appears in the From field, if any.
     * <p>String
     */
    global webservice String fromName;
    /**
     * A list of the RFC 2822 headers in the email.
     * <p>Usage
     * The list of the RFC 2822 headers includes:
     * Recieved from
     * Custom headers
     * Message-ID
     * Date
     * <p>InboundEmail.Header[]
     */
    global webservice List headers;
    /**
     * The HTML version of the email, if specified by the sender.
     * <p>String
     */
    global webservice String htmlBody;
    /**
     * Indicates whether the HTML body text is truncated (true) or not (false.)
     * <p>Boolean
     */
    global webservice Boolean htmlBodyIsTruncated;
    /**
     * The In-Reply-To field of the incoming email. Identifies the email or emails to which this one is a reply (parent emails). Contains the parent email or emails' message-IDs.
     * <p>String
     */
    global webservice String inReplyTo;
    /**
     * The Message-ID—the incoming email's unique identifier.
     * <p>String
     */
    global webservice String messageId;
    /**
     * The plain text version of the email, if specified by the sender.
     * <p>String
     */
    global webservice String plainTextBody;
    /**
     * Indicates whether the plain body text is truncated (true) or not (false.)
     * <p>Boolean
     */
    global webservice Boolean plainTextBodyIsTruncated;
    /**
     * The References field of the incoming email. Identifies an email thread. Contains a list of the parent emails' References and message IDs, and possibly the In-Reply-To fields.
     * <p>String[]
     */
    global webservice List references;
    /**
     * The email address that appears in the reply-to header.
     * <p>Usage
     * If there is no reply-to header, this field is identical to the fromAddress field.
     * <p>String
     */
    global webservice String replyTo;
    /**
     * The subject line of the email, if any.
     * <p>String
     */
    global webservice String subject;
    /**
     * A list of text attachments received with the email, if any.
     * <p>Usage
     * The text attachments can be any of the following:
     * Attachments with a Multipurpose Internet Mail Extension (MIME) type of text
     * Attachments with a MIME type of application/octet-stream and a file name that ends with either a .vcf or .vcs extension. These are saved as text/x-vcard and text/calendar MIME types, respectively.
     * <p>InboundEmail.TextAttachment[]
     */
    global webservice List textAttachments;
    /**
     * The email address that appears in the To field.
     * <p>String[]
     */
    global webservice List toAddresses;

    /**
     * Creates a new instance of the Messaging.InboundEmail class.
     */
    global InboundEmail() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    /**
     * Contains the authentication type and response for inbound emails.
     */
    global class AuthenticationResult {
        /**
         * Additional information in authentication result headers. Examples include: name: smtp.mailfrom and value: example.com.
         * <p>InboundEmail.AuthenticationResultField[]
         */
        global webservice List authenticationResultFields;
        /**
         * The authentication method used for the security check. Possible values include dkim, dmarc, or spf.
         * <p>String
         */
        global webservice String method;
        /**
         * The result of the authentication check. When the email service is configured to verify the legitimacy of the sending server before processing a message, possible values include pass or fail. Otherwise, the value returned is none.
         * <p>String
         */
        global webservice String result;

        /**
         * Creates a new instance of the Messaging.InboundEmail.AuthenticationResult class.
         */
        global AuthenticationResult() { }

        global Messaging.InboundEmail.AuthenticationResult clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * Contains field data from the authentication result response for inbound emails.
     */
    global class AuthenticationResultField {
        /**
         * The authentication result field name. For example: smtp.mailfrom.
         * <p>String
         */
        global webservice String name;
        /**
         * The authentication result field value. For example: example.com.
         * <p>String
         */
        global webservice String value;

        /**
         * Creates a new instance of the Messaging.InboundEmail.AuthenticationResultField class.
         */
        global AuthenticationResultField() { }

        global Messaging.InboundEmail.AuthenticationResultField clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * An InboundEmail object stores binary attachments in an InboundEmail.BinaryAttachment object.
     * <p>Usage
     * Examples of binary attachments include image, audio, application, and video files.
     */
    global class BinaryAttachment {
        /**
         * The body of the attachment.
         * <p>Blob
         */
        global webservice Blob body;
        /**
         * The name of the attached file.
         * <p>String
         */
        global webservice String fileName;
        /**
         * Any header values associated with the attachment. Examples of header names include Content-Type, Content-Transfer-Encoding, and Content-ID.
         * <p>List<Messaging.InboundEmail.Header>
         */
        global webservice List headers;
        /**
         * The primary and sub MIME-type.
         * <p>String
         */
        global webservice String mimeTypeSubType;

        /**
         * Creates a new instance of the Messaging.InboundEmail.BinaryAttachment class.
         */
        global BinaryAttachment() { }

        global Messaging.InboundEmail.BinaryAttachment clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * An InboundEmail object stores RFC 2822 email header information in an InboundEmail.Header object with the following properties.
     */
    global class Header {
        /**
         * The name of the header parameter, such as Date or Message-ID.
         * <p>String
         */
        global webservice String name;
        /**
         * The value of the header.
         * <p>String
         */
        global webservice String value;

        global Header() { }

        global Messaging.InboundEmail.Header clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }

    /**
     * An InboundEmail object stores text attachments in an InboundEmail.TextAttachment object.
     * <p>Usage
     * The text attachments can be any of the following:
     * Attachments with a Multipurpose Internet Mail Extension (MIME) type of text
     * Attachments with a MIME type of application/octet-stream and a file name that ends with either a .vcf or .vcs extension. These are saved as text/x-vcard and text/calendar MIME types, respectively.
     */
    global class TextAttachment {
        /**
         * The body of the attachment.
         * <p>String
         */
        global webservice String body;
        /**
         * Indicates whether the attachment body text is truncated (true) or not (false.)
         * <p>Boolean
         */
        global webservice Boolean bodyIsTruncated;
        /**
         * The original character set of the body field. The body is re-encoded as UTF-8 as input to the Apex method.
         * <p>String
         */
        global webservice String charset;
        /**
         * The name of the attached file.
         * <p>String
         */
        global webservice String fileName;
        /**
         * Any header values associated with the attachment. Examples of header names include Content-Type, Content-Transfer-Encoding, and Content-ID.
         * <p>List<Messaging.InboundEmail.Header>
         */
        global webservice List headers;
        /**
         * The primary and sub MIME-type.
         * <p>String
         */
        global webservice String mimeTypeSubType;

        /**
         * Creates a new instance of the Messaging.InboundEmail.TextAttachment class.
         */
        global TextAttachment() { }

        global Messaging.InboundEmail.TextAttachment clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}