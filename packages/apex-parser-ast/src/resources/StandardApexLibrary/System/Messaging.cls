/**
 * Contains messaging methods used when sending a single or mass email.
 * <p>Usage
 * Important
 * Sending email by using Apex requires domain-level and user-level email verification. System-generated emails also require verification of the From email address. Email delivery fails if any of these verifications is incomplete. See <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.security_email_verification_requirements.htm&amp;language=en_US&amp;type=5" target="_blank">Requirements to Send Email from Salesforce</a>.
 */
global class Messaging {
    /**
     * Use this method in your email service code to control how to parse and process forwarded or attached emails. Returns an instance of Messaging.InboundEmail from a stream of data that is in RFC822 format. The data stream can be a forwarded email in an attachment to an existing InboundEmail, or a stream from another source.
     */
    global static Messaging.InboundEmail extractInboundEmail(Object source, Boolean includeForwardedAttachments) { return null; }

    /**
     * Replaces merge fields in text bodies of email templates with values from Salesforce records. Returns an array of RenderEmailTemplateBodyResult objects, each of which corresponds to an element in the supplied array of text bodies. Each RenderEmailTemplateBodyResult provides a success or failure indication, along with either an error code or the rendered text.
     * <p>Usage
     * Use this method in situations in which you want to dynamically compose blocks of text that are enriched with data from the database. You can then use the the rendered blocks of text to compose and send an email or update a text value in another database record.
     * Executing the renderEmailTemplate method counts toward the SOQL governor limit. The number of SOQL queries that this method consumes is the number of elements in the list of strings passed in the bodies parameter.
     */
    global static List renderEmailTemplate(String whoId, String whatId, List bodies) { return null; }

    /**
     * Renders a text, custom, HTML, or Visualforce email template that exists in the database into an instance of Messaging.SingleEmailMessage. Includes all attachment content in the returned email message.
     * <p>Usage
     * Executing the renderStoredEmailTemplate method counts toward the SOQL governor limit as one query.
     */
    global static Messaging.SingleEmailMessage renderStoredEmailTemplate(String templateId, String whoId, String whatId) { return null; }

    /**
     * Renders a text, custom, HTML, or Visualforce email template that exists in the database into an instance of Messaging.SingleEmailMessage. Provides options for including attachment metadata only, attachment metadata and content, or excluding attachments.
     * <p>Usage
     * Executing the renderStoredEmailTemplate method counts toward the SOQL governor limit as one query.
     */
    global static Messaging.SingleEmailMessage renderStoredEmailTemplate(String templateId, String whoId, String whatId, Messaging.AttachmentRetrievalOption attachmentRetrievalOption) { return null; }

    /**
     * Renders a text, custom, HTML, or Visualforce email template that exists in the database into an instance of Messaging.SingleEmailMessage. Provides options for including attachment metadata only, attachment metadata and content, or excluding attachments.
     * <p>Usage
     * Executing the renderStoredEmailTemplate method counts toward the SOQL governor limit as one query.
     */
    global static Messaging.SingleEmailMessage renderStoredEmailTemplate(String templateId, String whoId, String whatId, Messaging.AttachmentRetrievalOption attachmentRetrievalOption, Boolean updateEmailTemplateUsage) { return null; }

    /**
     * Reserves email capacity to send mass email to the specified number of email addresses, after the current transaction commits.
     * <p>Usage
     * This method can be called when you know in advance how many addresses emails will be sent to as a result of the transaction. If the transaction would cause the organization to exceed its daily email limit, using this method results in the following error: System.HandledException: The daily limit for the org would be exceeded by this request.If the organization doesn’t have permission to send API or mass email, using this method results in the following error: System.NoAccessException: The organization is not permitted to send email.
     */
    global static void reserveMassEmailCapacity(Integer count) { }

    /**
     * Reserves email capacity to send single email to the specified number of email addresses, after the current transaction commits.
     * <p>Usage
     * This method can be called when you know in advance how many addresses emails will be sent to as a result of the transaction. If the transaction would cause the organization to exceed its daily email limit, using this method results in the following error: System.HandledException: The daily limit for the org would be exceeded by this request.If the organization doesn’t have permission to send API or mass email, using this method results in the following error: System.NoAccessException: The organization is not permitted to send email.
     */
    global static void reserveSingleEmailCapacity(Integer count) { }

    global static List sendEmail(List emailMessages) { return null; }

    /**
     * Sends the list of emails instantiated with either SingleEmailMessage or MassEmailMessage and returns a list of SendEmailResult objects. When org preferences are set to save EmailMessage objects and a trigger is defined for EmailMessage objects, the trigger is fired for each SingleEmailMessage individually. The sendEmail method can be called 10 times per Apex transaction and each method invocation can include up to 100 "To", 25 "Cc", and 25 "Bcc" recipients.
     */
    global static List sendEmail(List emailMessages, Boolean allOrNothing) { return null; }

    global static List sendEmailMessage(List emailMessagesIds) { return null; }

    /**
     * Sends draft email messages as defined by the specified email message IDs and returns a list of SendEmailResult objects.
     * <p>Usage
     * The sendEmailMessage method assumes that the optional allOrNothing parameter is always false and ignores the value you set. Delivery of all messages is attempted even if some messages fail due to an error.
     * The email address of the user calling the sendEmailMessage method is inserted in the From Address field of the email header and the Email Message record.
     * <p>Example
     * This example shows how to send a draft email message. It creates a case and a new email message associated with the case. Next, the example sends a draft email message and checks the results. Before running this example, make sure to replace the email address with a valid address.
     * Case c = new Case();
     * insert c;
     *
     * EmailMessage e = new EmailMessage();
     * e.parentid = c.id;
     * // Set to draft status.
     * // This status is required
     * // for sendEmailMessage().
     * e.Status = '5';
     * e.TextBody =
     *   'Sample email message.';
     * e.Subject = 'Apex sample';
     * e.ToAddress = 'customer@email.com';
     * insert e;
     *
     * List<Messaging.SendEmailResult>
     *   results =
     *   Messaging.sendEmailMessage(new ID[]
     *     { e.id });
     *
     * System.assertEquals(1, results.size());
     * System.assertEquals(true,
     *                     results[0].success);
     * <p>Versioned Behavior Changes
     * In API version 54.0 and later, a null emailMessageIds parameter results in a System.IllegalArgumentException exception. In API version 53.0 and earlier, a null emailMessageIds parameter results in an error.
     * @return If the emailMessageIds parameter is null, the method throws a System.IllegalArgumentException exception.
     */
    global static List sendEmailMessage(List emailMessagesIds, Boolean allOrNothing) { return null; }
}