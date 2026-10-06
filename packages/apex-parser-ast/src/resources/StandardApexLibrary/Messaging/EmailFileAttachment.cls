/**
 * EmailFileAttachment is used in SingleEmailMessage to specify attachments passed in as part of the request, as opposed to existing documents in Salesforce.
 * Usage
 * Important
 * Sending an email by using Apex requires domain-level and user-level email verification. System-generated emails also require verification of the From email address. Email delivery fails if any of these verifications is incomplete. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.security_email_verification_requirements.htm&amp;language=en_US&amp;type=5" target="_blank">Requirements to Send Email from Salesforce</a>.
 */
global class EmailFileAttachment {
    /**
     * Gets or sets the attachment itself.
     * Blob
     */
    global Blob body { get; set; }
    /**
     * Gets or sets the attachment's Content-Type.
     * String
     */
    global String contenttype { get; set; }
    /**
     * Gets or sets the name of the file to attach.
     * String
     */
    global String filename { get; set; }
    /**
     * Read-Only. Gets the attachment ID.
     * Id
     */
    global Id id { get; }
    /**
     * Specifies a Content-Disposition of inline (true) or attachment (false).
     * Boolean
     */
    global Boolean inline { get; set; }

    /**
     * Creates a new instance of the Messaging.EmailFileAttachment class.
     */
    global EmailFileAttachment() { }

    global Boolean equals(Object obj) { return false; }

    global Blob getBody() { return null; }

    global String getContentType() { return null; }

    global String getFileName() { return null; }

    global Id getId() { return null; }

    global Boolean getInline() { return false; }

    global Integer hashCode() { return 0; }

    global void setBody(Blob param1) { }

    global void setContentType(String param1) { }

    global void setFileName(String param1) { }

    global void setInline(Boolean param1) { }

    global String toString() { return null; }
}