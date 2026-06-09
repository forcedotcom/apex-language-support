/**
 * Represents an Apex class that provides: the From address list; the original email’s email message ID, provided that the reply action was invoked on the email message feed item; and methods to specify related settings on templates. You can override these fields before the standard Email Action is rendered.
 */
global class SendEmailQuickActionDefaults {

  global SendEmailQuickActionDefaults() {}

  /**
   * Returns a list of email addresses that are available in the From: address drop-down menu for the standard Email Action.
   * @return List<String>
   */
  global List<String> getFromAddressList() {}

  /**
   * Returns the email message ID of the email to which the reply/reply all action has been invoked.
   * @return Id
   */
  global Id getInReplyToId() {}

  /**
   * Specifies whether the template subject should be ignored (true), thus using the original subject, or whether the template subject should replace the original subject (false).
   * @param useOriginalSubject 
   */
  global void setIgnoreTemplateSubject(Boolean useOriginalSubject) {}

  /**
   * Specifies whether the template body should be inserted above the original body content (true) or whether it should replace the entire content with the template body (false).
   * @param keepOriginalBodyContent 
   */
  global void setInsertTemplateBody(Boolean keepOriginalBodyContent) {}

  /**
   * Sets the email template ID to load into the email body.
   * @param templateId The template ID.
   */
  global void setTemplateId(Id templateId) {}

  global Object clone() {}

  global String getActionName() {}

  global String getActionType() {}

  global Id getContextId() {}

  global SObject getTargetSObject() {}

}