/**
 * Contains methods for sending single email messages.
 * <p>Usage
 * Important
 * Sending an email by using Apex requires domain-level and user-level email verification. System-generated emails also require verification of the From email address. Email delivery fails if any of these verifications is incomplete. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.security_email_verification_requirements.htm&amp;language=en_US&amp;type=5" target="_blank">Requirements to Send Email from Salesforce</a>.
 * SingleEmailMessage extends Email and inherits all of its methods. All base email (Email class) methods are also available to the SingleEmailMessage objects. Emails sent via SingleEmailMessage count against the sending organization's daily single email limit.
 * Email properties are readable and writable. Each property has corresponding setter and getter methods. For example, the toAddresses() property is equivalent to the setToAddresses() and getToAddresses() methods. Only the setter methods are documented. However, the getTemplateName() method doesn’t have an equivalent setter method; use setTemplateId() to specify a template name.
 */
global class SingleEmailMessage extends Messaging.Email {
    global List bccaddresses { get; set; }
    global List ccaddresses { get; set; }
    global String charset { get; set; }
    global Map customheaders { get; set; }
    global List entityattachments { get; set; }
    global List fileattachments { get; set; }
    global String htmlbody { get; set; }
    global String inreplyto { get; set; }
    global Boolean oneclickpost { get; set; }
    global String optoutpolicy { get; set; }
    global Id orgwideemailaddressid { get; set; }
    global String plaintextbody { get; set; }
    global String references { get; set; }
    global Id targetobjectid { get; set; }
    global Id templateid { get; set; }
    global String templatename { get; }
    global List toaddresses { get; set; }
    global Boolean treatbodiesastemplate { get; set; }
    global Boolean treattargetobjectasrecipient { get; set; }
    global String unsubscribecomment { get; set; }
    global List unsubscribeurls { get; set; }
    global Boolean usermail { get; }
    global Id whatid { get; set; }

    /**
     * Creates a new instance of the Messaging.SingleEmailMessage class.
     */
    global SingleEmailMessage() { }

    global Boolean equals(Object obj) { return false; }

    global List getBccAddresses() { return null; }

    global Boolean getBccSender() { return false; }

    global List getCcAddresses() { return null; }

    global String getCharset() { return null; }

    /**
     * Returns the map of custom headers previously set for the email. Returns null if no custom headers were set.
     * <p>Usage
     * Use this method to retrieve or verify the custom headers assigned to a Messaging.SingleEmailMessage object before sending.
     * <p>Example
     * Map<String, String> headers = mail.getCustomHeaders();
     * if (headers != null && headers.containsKey('X-SFDC-X-SENDER-USER-ADDRESS')) {
     *     System.debug('Sender address header is set.');
     * }
     */
    global Map getCustomHeaders() { return null; }

    global String getEmailPriority() { return null; }

    global List getEntityAttachments() { return null; }

    global List getFileAttachments() { return null; }

    global String getHtmlBody() { return null; }

    global String getInReplyTo() { return null; }

    /**
     * Optional. Returns a boolean value based on the value set by the setOneClickPost method. Default is false.
     * <p>Usage
     * Invoke the setOneClickPostmethod before using getOneClickPost. The value of getOneClickPost will be false if the setOneClickPostmethod is set to true only after invoking the setUnsubscribeUrls method.
     */
    global Boolean getOneClickPost() { return false; }

    global String getOptOutPolicy() { return null; }

    global Id getOrgWideEmailAddressId() { return null; }

    global String getPlainTextBody() { return null; }

    global String getReferences() { return null; }

    global String getReplyTo() { return null; }

    global Boolean getSaveAsActivity() { return false; }

    global String getSenderDisplayName() { return null; }

    global String getSubject() { return null; }

    global Id getTargetObjectId() { return null; }

    global Id getTemplateId() { return null; }

    /**
     * The name of the template used to create the email.
     * <p>Usage
     * There is no equivalent setter method for getTemplateName(). If the email didn’t use a template, getTemplateName() returns nothing. If you use setTemplateId(), and then call getTemplateName(), the template name associated to the template ID is returned.
     */
    global String getTemplateName() { return null; }

    global List getToAddresses() { return null; }

    global String getUnsubscribeComment() { return null; }

    global List getUnsubscribeUrls() { return null; }

    global Boolean getUseSignature() { return false; }

    global Id getWhatId() { return null; }

    global Integer hashCode() { return 0; }

    global Boolean isTreatBodiesAsTemplate() { return false; }

    global Boolean isTreatTargetObjectAsRecipient() { return false; }

    global Boolean isUserMail() { return false; }

    /**
     * Optional. A list of blind carbon copy (BCC) addresses or object IDs of the contacts, leads, and users you’re sending the email to. The maximum size for this field is 4,000 bytes. The maximum total of toAddresses, ccAddresses, and bccAddresses per email is 150. All recipients in these three fields count against the limit for email sent using Apex or the API.
     * <p>Usage
     * All emails must have a recipient value in at least one of the following fields:
     * toAddresses
     * ccAddresses
     * bccAddresses
     * targetObjectId
     * If the BCC compliance option is set at the organization level, the user cannot add BCC addresses on standard messages. The following error code is returned: BCC_NOT_ALLOWED_IF_BCC_ COMPLIANCE_ENABLED. Contact your Salesforce representative for information on BCC compliance.
     */
    global void setBccAddresses(List param1) { }

    global void setBccSender(Boolean param1) { }

    /**
     * Optional. A list of carbon copy (CC) addresses or object IDs of the contacts, leads, and users you’re sending the email to. The maximum size for this field is 4,000 bytes. The maximum total of toAddresses, ccAddresses, and bccAddresses per email is 150. All recipients in these three fields count against the limit for email sent using Apex or the API.
     * <p>Usage
     * All emails must have a recipient value in at least one of the following fields:
     * toAddresses
     * ccAddresses
     * bccAddresses
     * targetObjectId
     */
    global void setCcAddresses(List param1) { }

    /**
     * Optional. The character set for the email. If this value is null, the user's default value is used.
     */
    global void setCharset(String param1) { }

    /**
     * Optional. Sets custom headers to include in the outgoing email. Each header name must be prefixed with X-SFDC-X-. If a header name doesn’t have this prefix, Salesforce automatically adds it. Salesforce enforces this prefix to ensure security and compliance with internal protocols. All header names and values must comply with RFC 822 and RFC 5322 specifications. Avoid duplicate headers.
     * <p>Usage
     * Use this method to add metadata required for systems such as eSurveillance or eDiscovery. For example, to include the sending user's address in a custom header, use the current user's email and add it to the map. To meet RFC standards, ensure that your header values don’t contain invalid characters, such as newlines or control characters.
     * <p>Example
     * Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
     *
     * Map<String, String> customHeaders = new Map<String, String>();
     * customHeaders.put('X-SFDC-X-Test-Header', 'Test-Value');
     * customHeaders.put('Another-Header', 'Another-Value');
     *
     * mail.setToAddresses(new String[] {'recipient@example.com'});
     * mail.setSubject('Test Email');
     * mail.setPlainTextBody('This is a test email sent from Apex.');
     *
     * mail.setOrgWideEmailAddressId('02SXXXXXXXXXXXX');
     * mail.setCustomHeaders(customHeaders);
     *
     * Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
     */
    global void setCustomHeaders(Map param1) { }

    global void setEmailPriority(String param1) { }

    /**
     * Optional. Array of IDs of <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.object_reference.meta/object_reference/sforce_api_objects_document.htm" target="_blank" title="HTML (New Window)">Document</a>, <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.object_reference.meta/object_reference/sforce_api_objects_contentversion.htm" target="_blank" title="HTML (New Window)">ContentVersion</a>, or <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.object_reference.meta/object_reference/sforce_api_objects_attachment.htm" target="_blank" title="HTML (New Window)">Attachment</a> items to attach to the email.
     */
    global void setEntityAttachments(List param1) { }

    global void setFileAttachments(List param1) { }

    /**
     * Optional. The HTML version of the email, specified by the sender. The value is encoded according to the specification associated with the organization. Specify a value for setTemplateId, setHtmlBody, or setPlainTextBody. Or, you can define both setHtmlBody and setPlainTextBody.
     */
    global void setHtmlBody(String param1) { }

    /**
     * Sets the optional In-Reply-To field of the outgoing email. This field identifies the email or emails to which this email is a reply (parent emails).
     */
    global void setInReplyTo(String param1) { }

    /**
     * Optional. If set to true, a List-Unsubscribe-Post header is added to an email with List-Unsubscribe=One-Click. Use this method to support unsubscribe functionality in email sent via Salesforce. You can provide additional instructions on how to send unsubscribe requests by using the header. This includes specifying the HTTP method and content type to use and provides a secure way to add more info to unsubscribe requests. Default is false.
     * <p>Usage
     * You can set the oneClickPost method to true only after invoking the setUnsubscribeUrls method. If set to true, pass at least one HTTPS unsubscribe URL to unsubscribe.
     * <p>Example
     * This example demonstrates how to send an email using Salesforce's Messaging.SingleEmailMessage class with enhanced unsubscribe functionality. It creates an email message with a recipient, subject, and body, and includes an unsubscribe URL. It also enables the oneClickPost feature, allowing for a simplified unsubscribe process. The email message is added to a list and sent using the Messaging.sendEmail method.
     * Messaging.SingleEmailMessage message = new Messaging.SingleEmailMessage();
     * // Set the recipient's email address
     * // Replace IDs with valid record IDs in your org.
     * message.toAddresses = new String[] { '003D000000QDexS' };
     * message.subject = 'Test Message';
     * message.plainTextBody = 'This is the message body.';
     *
     *
     * // Create a list to hold unsubscribe URLs
     * List<String> unsubscribeUrls = new List<String>();
     * unsubscribeUrls.add('https://example.com/unsubscribe.html?opaque=123456789');
     *
     *
     * // Assign the unsubscribe URLs to the email message
     * message.unsubscribeUrls = unsubscribeUrls;
     *
     *
     * // Enable the one-click unsubscribe feature
     * message.oneClickPost = true;
     *
     * Messaging.SingleEmailMessage[] messages =
     *     new List<Messaging.SingleEmailMessage> {message};
     * Messaging.SendEmailResult[] results = Messaging.sendEmail(messages);
     *
     *
     * if (results[0].success) {
     *     System.debug('The email was sent successfully.');
     * } else {
     *     System.debug('The email failed to send: '
     *           + results[0].errors[0].message);
     * }
     */
    global void setOneClickPost(Boolean param1) { }

    /**
     * Optional. If you added recipients by ID instead of email address and the Email Opt Out option is set, this method determines the behavior of the sendEmail() call. If you add recipients by their email addresses, the opt-out settings for those recipients aren’t checked and those recipients always receive the email.
     * <p>Example
     * This example shows how to send an email with the opt-out setting enforced. Recipients are specified by their IDs. The FILTER option causes the email to be sent only to recipients that haven’t opted out from email. This example uses dot notation of the email properties, which is equivalent to using the set methods.
     * Messaging.SingleEmailMessage message = new Messaging.SingleEmailMessage();
     * // Set recipients to two contact IDs.
     * // Replace IDs with valid record IDs in your org.
     * message.toAddresses = new String[] { '003D000000QDexS', '003D000000QDfW5' };
     * message.optOutPolicy = 'FILTER';
     * message.subject = 'Opt Out Test Message';
     * message.plainTextBody = 'This is the message body.';
     * Messaging.SingleEmailMessage[] messages =
     *     new List<Messaging.SingleEmailMessage> {message};
     *          Messaging.SendEmailResult[] results = Messaging.sendEmail(messages);
     * if (results[0].success) {
     *     System.debug('The email was sent successfully.');
     * } else {
     *     System.debug('The email failed to send: '
     *           + results[0].errors[0].message);
     * }
     */
    global void setOptOutPolicy(String param1) { }

    /**
     * Optional. The ID of the organization-wide email address associated with the outgoing email. If you’re using Apex to send emails from the guest user, set the sender to the verified org-wide email address or the emails are blocked. The object's DisplayName field cannot be set if the setSenderDisplayName field is already set.
     * <p>Usage
     * After you create an org-wide email address, you’re sent a confirmation email to verify it. Copy the Id from the URL and use the setOrgWideEmailAddressId(Id) method on your instance of Messaging.SingleEmailMessage.
     * To avoid hard-coding an ID, after creating your org-wide email address, you can query them.
     * OrgWideEmailAddress[] owea = [select Id from OrgWideEmailAddress where Address = 'doNotReply@<somedomain>.com'];
     * Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
     * if ( owea.size() > 0 ) {
     *     mail.setOrgWideEmailAddressId(owea.get(0).Id);
     * }
     */
    global void setOrgWideEmailAddressId(Id param1) { }

    /**
     * Optional. The text version of the email, specified by the sender. Specify a value for setTemplateId, setHtmlBody, or setPlainTextBody. Or, you can define both setHtmlBody and setPlainTextBody.
     */
    global void setPlainTextBody(String param1) { }

    /**
     * Optional. The References field of the outgoing email. Identifies an email thread. Contains the parent emails' References and message IDs, and possibly the In-Reply-To fields.
     */
    global void setReferences(String param1) { }

    global void setReplyTo(String param1) { }

    global void setSaveAsActivity(Boolean param1) { }

    global void setSenderDisplayName(String param1) { }

    /**
     * Optional. The email subject line. If you are using an email template, the subject line of the template overrides this value.
     */
    global void setSubject(String param1) { }

    /**
     * Required if using a template, optional otherwise. The ID of the contact, lead, or user to which the email will be sent. The ID you specify sets the context and ensures that merge fields in the template contain the correct data.
     * <p>Usage
     * Do not specify the IDs of records that have the Email Opt Out option selected.
     * All emails must have a recipient value in at least one of the following fields:
     * toAddresses
     * ccAddresses
     * bccAddresses
     * targetObjectId
     */
    global void setTargetObjectId(Id param1) { }

    /**
     * Required if using a template, optional otherwise. The ID of the template used to create the email.
     */
    global void setTemplateId(Id param1) { }

    /**
     * Optional. A list of email addresses or object IDs of the contacts, leads, and users you’re sending the email to. The maximum size for this field is 4,000 bytes. The maximum total of toAddresses, ccAddresses, and bccAddresses per email is 150. All recipients in these three fields count against the limit for email sent using Apex or the API.
     * <p>Usage
     * All emails must have a recipient value in at least one of the following fields:
     * toAddresses
     * ccAddresses
     * bccAddresses
     * targetObjectId
     */
    global void setToAddresses(List param1) { }

    /**
     * Optional. If set to true, the subject, plain text, and HTML text bodies of the email are treated as template data. The merge fields are resolved using the renderEmailTemplate method. Default is false.
     */
    global void setTreatBodiesAsTemplate(Boolean param1) { }

    /**
     * Optional. If set to true, the targetObjectId (a contact, lead, or user) is the recipient of the email. If set to false, the targetObjectId is supplied as the WhoId field for template rendering but isn’t a recipient of the email. The default is true.
     * <p>Usage
     * Note
     * You can set TO, CC, and BCC addresses using the email messaging methods regardless of whether a template is used for the email or the target object is a recipient.
     */
    global void setTreatTargetObjectAsRecipient(Boolean param1) { }

    /**
     * Optional. Sets a comment in the List-Unsubscribe email header. This comment is ignored by email clients and systems that parse the header. The comments contain human-readable notes or context for developers, administrators, or other stakeholders managing the email system.
     * <p>Usage
     * Invoke the setUnsubscribeUrls method before using setUnsubscribeComment.
     * <p>Example
     * This example demonstrates how to send an email using Salesforce's Messaging.SingleEmailMessage class with an option to include an unsubscribe link. It creates an email message with a recipient, subject, and body, and includes an unsubscribe URL that directs the recipient to send an unsubscribe request via email. Additionally, it sets an unsubscribeComment to provide context for the unsubscribe action.
     * Messaging.SingleEmailMessage message = new Messaging.SingleEmailMessage();
     * // Set the recipient's email address
     * // Replace IDs with valid record IDs in your org
     * message.toAddresses = new String[] { '003D000000QDexS' };
     * message.subject = 'Test Message';
     * message.plainTextBody = 'This is the message body.';
     *
     *
     * // Create a list to hold unsubscribe URLs
     * List<String> unsubscribeUrls = new List<String>();
     * unsubscribeUrls.add('mailto:listrequest@example.com?subject=unsubscribe');
     *
     *
     * // Assign the unsubscribe URLs to the email message
     * message.unsubscribeUrls = unsubscribeUrls;
     *
     *
     * // Set an unsubscribe comment to provide context for the unsubscribe action
     * message.unsubscribeComment = 'email unsubscribe support';
     *
     * Messaging.SingleEmailMessage[] messages =
     *     new List<Messaging.SingleEmailMessage> {message};
     * Messaging.SendEmailResult[] results = Messaging.sendEmail(messages);
     *
     *
     * if (results[0].success) {
     *     System.debug('The email was sent successfully.');
     * } else {
     *     System.debug('The email failed to send: '
     *           + results[0].errors[0].message);
     * }
     */
    global void setUnsubscribeComment(String param1) { }

    /**
     * Optional. Sets a mailto URI and HTTP URL of a mechanism for unsubscribing a recipient from an email list. A list of all unsubscribe URLs passed through setUnsubscribeUrls is added to the List-Unsubscribe header. A minimum of one URL is required to use this method.
     * <p>Usage
     * Provide a list of URLs that support unsubscribe functionality by offering recipients multiple ways to opt-out of future communications. Each provided URL can use different protocols to allow for technical capacities of the recipient.
     * All setUnsubscribeUrls must have a value of one of these types:
     * Mailto: Allows recipients to send an unsubscribe request via email.
     * Example: mailto:listrequest@example.com?subject=unsubscribe
     * HTTP: Directs recipients to a web page where they can unsubscribe.
     * Example: http://example.com/unsubscribe.html?opaque=123456789
     * HTTPS: Directs recipients to a secure web page to unsubscribe.
     * Example: https://example.com/unsubscribe.html?opaque=123456789
     * <p>Example
     * This example demonstrates how to send an email using Salesforce's Messaging.SingleEmailMessage class that includes an option to include an unsubscribe link for a user to click. It creates an email message, sets the recipient's email address, subject, and body, and includes an unsubscribe URL. The email message is added to a list and sent using the Messaging.sendEmail method.
     * Messaging.SingleEmailMessage message = new Messaging.SingleEmailMessage();
     * // Set the recipient's email address
     * // Replace IDs with valid record IDs in your org.
     * message.toAddresses = new String[] { '003D000000QDexS' };
     * message.subject = 'Test Message';
     * message.plainTextBody = 'This is the message body.';
     *
     *
     * // Create a list to hold unsubscribe URLs
     * List<String> unsubscribeUrls = new List<String>();
     * unsubscribeUrls.add('https://example.com/unsubscribe.html?opaque=123456789');
     *
     *
     * // Assign the unsubscribe URLs to the email message
     * message.unsubscribeUrls = unsubscribeUrls;
     *
     * Messaging.SingleEmailMessage[] messages =
     *     new List<Messaging.SingleEmailMessage> {message};
     * Messaging.SendEmailResult[] results = Messaging.sendEmail(messages);
     *
     *
     * if (results[0].success) {
     *     System.debug('The email was sent successfully.');
     * } else {
     *     System.debug('The email failed to send: '
     *           + results[0].errors[0].message);
     * }
     */
    global void setUnsubscribeUrls(List param1) { }

    global void setUseSignature(Boolean param1) { }

    /**
     * If you specify a contact for the targetObjectId field, you can specify an optional whatId as well. This helps to further ensure that merge fields in the template contain the correct data.
     * <p>Usage
     * The value must be one of the following types:
     * Account
     * Asset
     * Campaign
     * Case
     * Contract
     * Opportunity
     * Order
     * Product
     * Solution
     * Custom
     */
    global void setWhatId(Id param1) { }

    global String toString() { return null; }
}