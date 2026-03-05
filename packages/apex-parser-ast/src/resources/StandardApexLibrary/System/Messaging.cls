/**
 * Contains messaging methods used when sending a single or mass email.
 */
global class Messaging {

  /**
   * Use this method in your email service code to control how to parse and process forwarded or attached emails. Returns an instance of Messaging.InboundEmail from a stream of data that is in RFC822 format. The data stream can be a forwarded email in an attachment to an existing InboundEmail, or a stream from another source.
   * @param source An instance of Messaging.InboundEmail.BinaryAttachment whose MimeTypeSubtype is message/rfc822 or a Blob. If source is a Blob, then supply a byte array in RFC822 format.
   * @param includeForwardedAttachments This parameter controls how attachments to embedded or forwarded emails are handled. Set to true to provide all attachments, even attachments in embedded emails in the binaryAttachments and textAttachments properties of the returned value. Set to false to provide only the attachments that are at the top level of the source email.
   * @return Messaging.InboundEmail
   */
  public static Messaging.InboundEmail extractInboundEmail(Object source, Boolean includeForwardedAttachments) {}

  /**
   * Reserves email capacity to send mass email to the specified number of email addresses, after the current transaction commits.
   * @param amountReserved 
   */
  public void reserveMassEmailCapacity(Integer amountReserved) {}

  /**
   * Reserves email capacity to send single email to the specified number of email addresses, after the current transaction commits.
   * @param amountReserved 
   */
  public void reserveSingleEmailCapacity(Integer amountReserved) {}

  /**
   * Sends the list of emails instantiated with either SingleEmailMessage or MassEmailMessage and returns a list of SendEmailResult objects. When org preferences are set to save EmailMessage objects and a trigger is defined for EmailMessage objects, the trigger is fired for each SingleEmailMessage individually. The sendEmail method can be called 10 times per Apex transaction and each method invocation can include up to 100 "To", 25 "Cc", and 25 "Bcc" recipients.
   * @param emails 
   * @param allOrNothing The optional opt_allOrNone parameter specifies whether sendEmail prevents delivery of all other messages when any of the messages fail due to an error ( true ), or whether it allows delivery of the messages that don't have errors ( false ). The default is true .
   * @return Messaging.SendEmailResult[]
   */
  public Messaging.SendEmailResult[] sendEmail(Messaging.Email[] emails, Boolean allOrNothing) {}

  public Messaging.SendEmailResult[] sendEmailMessage(List<ID> emailMessageIds, Boolean allOrNothing) {}

  /**
   * Replaces merge fields in text bodies of email templates with values from Salesforce records. Returns an array of RenderEmailTemplateBodyResult objects, each of which corresponds to an element in the supplied array of text bodies. Each RenderEmailTemplateBodyResult provides a success or failure indication, along with either an error code or the rendered text.
   * @param whoId The identifier of an object in the database, typically a contact, lead, or user. The database record for that object is read and used in merge field processing.
   * @param whatId Identifies an object in the database like an account or opportunity. The record for that object is read and used in merge field processing.
   * @param bodies An array of strings that are examined for merge field references. The corresponding data from the object referenced by the whoId or whatId replaces the merge field reference.
   * @return List<Messaging.RenderEmailTemplateBodyResult>
   */
  public static List<Messaging.RenderEmailTemplateBodyResult> renderEmailTemplate(String whoId, String whatId, List<String> bodies) {}

  /**
   * Renders a text, custom, HTML, or Visualforce email template that exists in the database into an instance of Messaging.SingleEmailMessage . Includes all attachment content in the returned email message.
   * @param templateId An email template that exists in the database, such as text, HTML, custom, and Visualforce templates.
   * @param whoId The identifier of an object in the database, typically a contact, lead, or user. The database record for that object is read and used in merge field processing.
   * @param whatId Identifies an object in the database, like an account or opportunity. The record for that object is read and used in merge field processing.
   * @return Messaging.SingleEmailMessage
   */
  public static Messaging.SingleEmailMessage renderStoredEmailTemplate(String templateId, String whoId, String whatId) {}

  /**
   * Renders a text, custom, HTML, or Visualforce email template that exists in the database into an instance of Messaging.SingleEmailMessage . Includes all attachment content in the returned email message.
   * @param templateId An email template that exists in the database, such as text, HTML, custom, and Visualforce templates.
   * @param whoId The identifier of an object in the database, typically a contact, lead, or user. The database record for that object is read and used in merge field processing.
   * @param whatId Identifies an object in the database, like an account or opportunity. The record for that object is read and used in merge field processing.
   * @param attachmentRetrievalOption 
   * @return Messaging.SingleEmailMessage
   */
  public static Messaging.SingleEmailMessage renderStoredEmailTemplate(String templateId, String whoId, String whatId, Messaging.AttachmentRetrievalOption attachmentRetrievalOption) {}

  /**
   * Renders a text, custom, HTML, or Visualforce email template that exists in the database into an instance of Messaging.SingleEmailMessage . Includes all attachment content in the returned email message.
   * @param templateId An email template that exists in the database, such as text, HTML, custom, and Visualforce templates.
   * @param whoId The identifier of an object in the database, typically a contact, lead, or user. The database record for that object is read and used in merge field processing.
   * @param whatId Identifies an object in the database, like an account or opportunity. The record for that object is read and used in merge field processing.
   * @param attachmentRetrievalOption 
   * @param updateEmailTemplateUsage 
   * @return Messaging.SingleEmailMessage
   */
  public static Messaging.SingleEmailMessage renderStoredEmailTemplate(String templateId, String whoId, String whatId, Messaging.AttachmentRetrievalOption attachmentRetrievalOption, Boolean updateEmailTemplateUsage) {}

}