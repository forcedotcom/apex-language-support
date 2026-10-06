/**
 * Provides options for including attachment metadata only, attachment metadata and content, or excluding attachments.
 * Usage
 * Important
 * Sending an email by using Apex requires domain-level and user-level email verification. System-generated emails also require verification of the From email address. Email delivery fails if any of these verifications is incomplete. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.security_email_verification_requirements.htm&amp;language=en_US&amp;type=5" target="_blank">Requirements to Send Email from Salesforce</a>.
 * Use these enum values with the renderStoredEmailTemplate(templateId, whoId, whatId, attachmentRetrievalOption) method.
 * Enum Values
 * The following are the values of the Messaging.AttachmentRetrievalOption enum.
 */
global enum AttachmentRetrievalOption {
    METADATA_ONLY,
    METADATA_WITH_BODY,
    NONE

}