/**
 * Contains methods for sending mass email.
 */
global class MassEmailMessage {

  global MassEmailMessage() {}

  /**
   * The description of the email.
   * @param description 
   */
  global void setDescription(String description) {}

  /**
   * A list of IDs of the contacts, leads, or users to which the email will be sent. The IDs you specify set the context and ensure that merge fields in the template contain the correct data. The objects must be of the same type (all contacts, all leads, or all users).
   * @param targetObjectIds 
   */
  global void setTargetObjectIds(ID[] targetObjectIds) {}

  /**
   * Optional. If you specify a list of contacts for the targetObjectIds field, you can specify a list of whatIds as well. This helps to further ensure that merge fields in the template contain the correct data.
   * @param whatIds 
   */
  global void setWhatIds(ID[] whatIds) {}

  global Boolean getBccSender() {}

  global String getDescription() {}

  global String getEmailPriority() {}

  global String getReplyTo() {}

  global Boolean getSaveAsActivity() {}

  global String getSenderDisplayName() {}

  global String getSubject() {}

  global List<Id> getTargetObjectIds() {}

  global Id getTemplateId() {}

  global Boolean getUseSignature() {}

  global List<Id> getWhatIds() {}

  global void setBccSender(Boolean arg0) {}

  global void setEmailPriority(String arg0) {}

  global void setReplyTo(String arg0) {}

  global void setSaveAsActivity(Boolean arg0) {}

  global void setSenderDisplayName(String arg0) {}

  global void setSubject(String arg0) {}

  global void setTemplateId(Id arg0) {}

  global void setUseSignature(Boolean arg0) {}

  global Object clone() {}

}