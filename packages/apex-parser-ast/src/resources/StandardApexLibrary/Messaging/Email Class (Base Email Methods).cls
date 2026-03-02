/**
 * Contains base email methods common to both single and mass email.
 */
public class Email Class (Base Email Methods) {

  /**
   * Indicates whether the email sender receives a copy of the email that is sent. For a mass mail, the sender is only copied on the first email sent.
   * @param bcc 
   * @return Void
   */
  public Void setBccSender(Boolean bcc) {}

  /**
   * Optional. The email address that receives the message when a recipient replies.
   * @param replyAddress 
   * @return Void
   */
  public Void setReplyTo(String replyAddress) {}

  /**
   * The ID of the template to be merged to create this email. Specify a value for setTemplateId , setHtmlBody , or setPlainTextBody . Or, you can define both setHtmlBody and setPlainTextBody .
   * @param templateId 
   * @return Void
   */
  public Void setTemplateID(ID templateId) {}

  /**
   * Optional. The default value is true , meaning the email is saved as an activity. This argument only applies if the recipient list is based on targetObjectId or targetObjectIds . If HTML email tracking is enabled for the organization, you will be able to track open rates.
   * @param saveAsActivity 
   * @return Void
   */
  public Void setSaveAsActivity(Boolean saveAsActivity) {}

  /**
   * Optional. The name that appears on the From line of the email. This cannot be set if the object associated with a setOrgWideEmailAddressId for a SingleEmailMessage has defined its DisplayName field.
   * @param displayName 
   * @return Void
   */
  public Void setSenderDisplayName(String displayName) {}

  /**
   * Indicates whether the email includes an email signature if the user has one configured. The default is true , meaning if the user has a signature it is included in the email unless you specify false .
   * @param useSignature 
   * @return Void
   */
  public Void setUseSignature(Boolean useSignature) {}

}