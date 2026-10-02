/**
 * Contains base email methods common to both single and mass email.
 * <p>Usage
 * Important
 * Sending an email by using Apex requires domain-level and user-level email verification. System-generated emails also require verification of the From email address. Email delivery fails if any of these verifications is incomplete. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.security_email_verification_requirements.htm&amp;language=en_US&amp;type=5" target="_blank">Requirements to Send Email from Salesforce</a>.
 * If templates are not being used, all email content must be in plain text, HTML, or both.Visualforce email templates cannot be used for mass email.
 */
global class Email {
    global Boolean bccsender { get; set; }
    global String emailpriority { get; set; }
    global String replyto { get; set; }
    global Boolean saveasactivity { get; set; }
    global String senderdisplayname { get; set; }
    global String subject { get; set; }
    global Boolean usesignature { get; set; }

    global Boolean equals(Object obj) { return false; }

    global Boolean getBccSender() { return false; }

    global String getEmailPriority() { return null; }

    global String getReplyTo() { return null; }

    global Boolean getSaveAsActivity() { return false; }

    global String getSenderDisplayName() { return null; }

    global String getSubject() { return null; }

    global Boolean getUseSignature() { return false; }

    global Integer hashCode() { return 0; }

    /**
     * Indicates whether the email sender receives a copy of the email that is sent. For a mass mail, the sender is only copied on the first email sent.
     * <p>Usage
     * Note
     * If the BCC compliance option is set at the organization level, the user cannot add BCC addresses on standard messages. The following error code is returned: BCC_NOT_ALLOWED_IF_BCC_ COMPLIANCE_ENABLED. Contact your Salesforce representative for information on BCC compliance.
     */
    global void setBccSender(Boolean param1) { }

    global void setEmailPriority(String param1) { }

    /**
     * Optional. The email address that receives the message when a recipient replies.
     */
    global void setReplyTo(String param1) { }

    /**
     * Optional. The default value is true, meaning the email is saved as an activity. This argument only applies if the recipient list is based on targetObjectId or targetObjectIds. If HTML email tracking is enabled for the organization, you will be able to track open rates.
     */
    global void setSaveAsActivity(Boolean param1) { }

    /**
     * Optional. The name that appears on the From line of the email. This cannot be set if the object associated with a setOrgWideEmailAddressId for a SingleEmailMessage has defined its DisplayName field.
     */
    global void setSenderDisplayName(String param1) { }

    global void setSubject(String param1) { }

    /**
     * Indicates whether the email includes an email signature if the user has one configured. The default is true, meaning if the user has a signature it is included in the email unless you specify false.
     */
    global void setUseSignature(Boolean param1) { }

    global String toString() { return null; }
}