/**
 * Contains methods for sending single email messages.
 */
global class SingleEmailMessage {

  global SingleEmailMessage() {}

  global Boolean getOneClickPost() {}

  /**
   * The name of the template used to create the email.
   * @return STRING
   */
  global STRING getTemplateName() {}

  /**
   * Optional. A list of blind carbon copy (BCC) addresses or object IDs of the contacts, leads, and users you’re sending the email to. The maximum size for this field is 4,000 bytes. The maximum total of toAddresses , ccAddresses , and bccAddresses per email is 150. All recipients in these three fields count against the limit for email sent using Apex or the API.
   * @param bccAddresses 
   */
  global void setBccAddresses(String[] bccAddresses) {}

  /**
   * Optional. A list of carbon copy (CC) addresses or object IDs of the contacts, leads, and users you’re sending the email to. The maximum size for this field is 4,000 bytes. The maximum total of toAddresses , ccAddresses , and bccAddresses per email is 150. All recipients in these three fields count against the limit for email sent using Apex or the API.
   * @param ccAddresses 
   */
  global void setCcAddresses(String[] ccAddresses) {}

  /**
   * Optional. The character set for the email. If this value is null, the user's default value is used.
   * @param characterSet 
   */
  global void setCharset(String characterSet) {}

  /**
   * (Deprecated. Use setEntityAttachments() instead.) Optional. A list containing the ID of each document object you want to attach to the email.
   * @param documentIds 
   */
  global void setDocumentAttachments(ID[] documentIds) {}

  /**
   * Optional. Array of IDs of Document , ContentVersion , or Attachment items to attach to the email.
   * @param ids 
   */
  global void setEntityAttachments(List<String> ids) {}

  /**
   * Optional. A list containing the file names of the binary and text files you want to attach to the email.
   * @param fileNames 
   */
  global void setFileAttachments(EmailFileAttachment[] fileNames) {}

  /**
   * Optional. The HTML version of the email, specified by the sender. The value is encoded according to the specification associated with the organization. Specify a value for setTemplateId , setHtmlBody , or setPlainTextBody . Or, you can define both setHtmlBody and setPlainTextBody .
   * @param htmlBody 
   */
  global void setHtmlBody(String htmlBody) {}

  /**
   * Sets the optional In-Reply-To field of the outgoing email. This field identifies the email or emails to which this email is a reply (parent emails).
   * @param parentMessageIds Contains one or more parent email message IDs.
   */
  global void setInReplyTo(String parentMessageIds) {}

  global void setOneClickPost(Boolean oneClickPost) {}

  /**
   * Optional. If you added recipients by ID instead of email address and the Email Opt Out option is set, this method determines the behavior of the sendEmail() call. If you add recipients by their email addresses, the opt-out settings for those recipients aren’t checked and those recipients always receive the email.
   * @param emailOptOutPolicy Possible values of the emailOptOutPolicy parameter are: SEND (default)—The email is sent to all recipients. The recipients’ Email Opt Out setting is ignored. The setting Enforce email privacy settings is ignored. FILTER —No email is sent to recipients that have the Email Opt Out option set. Emails are sent to the other recipients. The setting Enforce email privacy settings is ignored. REJECT —If any of the recipients have the Email Opt Out option set, sendEmail() throws an error and no email is sent. The setting Enforce email privacy settings is respected, as are the selections in the data privacy record based on the Individual object. If any of the recipients have Don’t Market, Don’t Process, or Forget This Individual selected, sendEmail() throws an error and no email is sent.
   */
  global void setOptOutPolicy(String emailOptOutPolicy) {}

  /**
   * Optional. The text version of the email, specified by the sender. Specify a value for setTemplateId , setHtmlBody , or setPlainTextBody . Or, you can define both setHtmlBody and setPlainTextBody .
   * @param plainTextBody 
   */
  global void setPlainTextBody(String plainTextBody) {}

  /**
   * Optional. The ID of the organization-wide email address associated with the outgoing email. If you’re using Apex to send emails from the guest user, set the sender to the verified org-wide email address or the emails are blocked. The object's DisplayName field cannot be set if the setSenderDisplayName field is already set.
   * @param emailAddressId 
   */
  global void setOrgWideEmailAddressId(ID emailAddressId) {}

  /**
   * Optional. The References field of the outgoing email. Identifies an email thread. Contains the parent emails' References and message IDs, and possibly the In-Reply-To fields.
   * @param references 
   */
  global void setReferences(String references) {}

  /**
   * Optional. The email subject line. If you are using an email template, the subject line of the template overrides this value.
   * @param subject 
   */
  global void setSubject(String subject) {}

  /**
   * Required if using a template, optional otherwise. The ID of the contact, lead, or user to which the email will be sent. The ID you specify sets the context and ensures that merge fields in the template contain the correct data.
   * @param targetObjectId 
   */
  global void setTargetObjectId(ID targetObjectId) {}

  /**
   * Required if using a template, optional otherwise. The ID of the template used to create the email.
   * @param templateId 
   */
  global void setTemplateId(ID templateId) {}

  /**
   * Optional. A list of email addresses or object IDs of the contacts, leads, and users you’re sending the email to. The maximum size for this field is 4,000 bytes. The maximum total of toAddresses , ccAddresses , and bccAddresses per email is 150. All recipients in these three fields count against the limit for email sent using Apex or the API.
   * @param toAddresses 
   */
  global void setToAddresses(String[] toAddresses) {}

  /**
   * Optional. If set to true , the subject, plain text, and HTML text bodies of the email are treated as template data. The merge fields are resolved using the renderEmailTemplate method. Default is false .
   * @param treatAsTemplate 
   */
  global void setTreatBodiesAsTemplate(Boolean treatAsTemplate) {}

  /**
   * Optional. If set to true , the targetObjectId (a contact, lead, or user) is the recipient of the email. If set to false , the targetObjectId is supplied as the WhoId field for template rendering but isn’t a recipient of the email. The default is true .
   * @param treatAsRecipient 
   */
  global void setTreatTargetObjectAsRecipient(Boolean treatAsRecipient) {}

  global void setUnsubscribeComment(String unsubscribeComment) {}

  global void setUnsubscribeUrls(List<String> unsubscribeUrls) {}

  /**
   * If you specify a contact for the targetObjectId field, you can specify an optional whatId as well. This helps to further ensure that merge fields in the template contain the correct data.
   * @param whatId 
   */
  global void setWhatId(ID whatId) {}

  global List<String> getBccAddresses() {}

  global Boolean getBccSender() {}

  global List<String> getCcAddresses() {}

  global String getCharset() {}

  global Map<String,String> getCustomHeaders() {}

  global String getEmailPriority() {}

  global List<String> getEntityAttachments() {}

  global List<Messaging.EmailFileAttachment> getFileAttachments() {}

  global String getHtmlBody() {}

  global String getInReplyTo() {}

  global String getOptOutPolicy() {}

  global Id getOrgWideEmailAddressId() {}

  global String getPlainTextBody() {}

  global String getReferences() {}

  global String getReplyTo() {}

  global Boolean getSaveAsActivity() {}

  global String getSenderDisplayName() {}

  global String getSubject() {}

  global Id getTargetObjectId() {}

  global Id getTemplateId() {}

  global List<String> getToAddresses() {}

  global String getUnsubscribeComment() {}

  global List<String> getUnsubscribeUrls() {}

  global Boolean getUseSignature() {}

  global Id getWhatId() {}

  global Boolean isTreatBodiesAsTemplate() {}

  global Boolean isTreatTargetObjectAsRecipient() {}

  global Boolean isUserMail() {}

  global void setBccSender(Boolean arg0) {}

  global void setCustomHeaders(Map<String,String> arg0) {}

  global void setEmailPriority(String arg0) {}

  global void setReplyTo(String arg0) {}

  global void setSaveAsActivity(Boolean arg0) {}

  global void setSenderDisplayName(String arg0) {}

  global void setUseSignature(Boolean arg0) {}

  global Object clone() {}

}