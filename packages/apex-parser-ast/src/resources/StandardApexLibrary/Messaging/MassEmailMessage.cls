/**
 * Contains methods for sending mass email.
 * <p>Usage
 * Important
 * Sending an email by using Apex requires domain-level and user-level email verification. System-generated emails also require verification of the From email address. Email delivery fails if any of these verifications is incomplete. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.security_email_verification_requirements.htm&amp;language=en_US&amp;type=5" target="_blank">Requirements to Send Email from Salesforce</a>.
 * MassEmailMessage extends Email and inherits all of its methods. All base email (Email class) methods are also available to the MassEmailMessage objects.
 */
global class MassEmailMessage extends Messaging.Email {
    global String description { get; set; }
    global List targetobjectids { get; set; }
    global Id templateid { get; set; }
    global List whatids { get; set; }

    /**
     * Creates a new instance of the Messaging.MassEmailMessage class.
     */
    Object MassEmailMessage() { return null; }

    global Boolean equals(Object obj) { return false; }

    global Boolean getBccSender() { return false; }

    global String getDescription() { return null; }

    global String getEmailPriority() { return null; }

    global String getReplyTo() { return null; }

    global Boolean getSaveAsActivity() { return false; }

    global String getSenderDisplayName() { return null; }

    global String getSubject() { return null; }

    global List getTargetObjectIds() { return null; }

    global Id getTemplateId() { return null; }

    global Boolean getUseSignature() { return false; }

    global List getWhatIds() { return null; }

    global Integer hashCode() { return 0; }

    global void setBccSender(Boolean param1) { }

    /**
     * The description of the email.
     */
    global void setDescription(String param1) { }

    global void setEmailPriority(String param1) { }

    global void setReplyTo(String param1) { }

    global void setSaveAsActivity(Boolean param1) { }

    global void setSenderDisplayName(String param1) { }

    global void setSubject(String param1) { }

    /**
     * A list of IDs of the contacts, leads, or users to which the email will be sent. The IDs you specify set the context and ensure that merge fields in the template contain the correct data. The objects must be of the same type (all contacts, all leads, or all users).
     * <p>Usage
     * You can list multiple IDs per email. If you specify a value for the targetObjectIds field, optionally specify a whatId as well to set the email context to a user, contact, or lead. This ensures that merge fields in the template contain the correct data. Each ID counts against the sending organization’s daily mass email limit, except for user IDs. Each ID counts against the sending organization’s daily mass email limit, except for IDs of users in the organization.
     * Do not specify the IDs of records that have the Email Opt Out option selected.
     * All emails must have a recipient value in at least one of the following fields:
     * toAddresses
     * ccAddresses
     * bccAddresses
     * targetObjectId
     */
    global void setTargetObjectIds(List param1) { }

    global void setTemplateId(Id param1) { }

    global void setUseSignature(Boolean param1) { }

    /**
     * Optional. If you specify a list of contacts for the targetObjectIds field, you can specify a list of whatIds as well. This helps to further ensure that merge fields in the template contain the correct data.
     * <p>Usage
     * The values must be one of the following types:
     * Contract
     * Case
     * Opportunity
     * Product
     * Note
     * If you specify whatIds, specify one for each targetObjectId; otherwise, you will receive an INVALID_ID_FIELD error.
     */
    global void setWhatIds(List param1) { }

    global String toString() { return null; }
}