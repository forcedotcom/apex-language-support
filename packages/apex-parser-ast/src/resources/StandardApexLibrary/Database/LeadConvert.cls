/**
 * Contains information used for lead conversion.
 */
global class LeadConvert {

  global LeadConvert() {}

  /**
   * Gets the ID of the account into which the lead will be merged.
   * @return ID
   */
  global ID getAccountId() {}

  /**
   * Gets the ID of the contact into which the lead will be merged.
   * @return ID
   */
  global ID getContactId() {}

  /**
   * Gets the lead status value for a converted lead.
   * @return String
   */
  global String getConvertedStatus() {}

  /**
   * Gets the ID of the lead to convert.
   * @return ID
   */
  global ID getLeadID() {}

  /**
   * Gets the ID of the existing opportunity that will be related to the resulting contact.
   * @return ID
   */
  global ID getOpportunityId() {}

  /**
   * Gets the name of the opportunity to create.
   * @return String
   */
  global String getOpportunityName() {}

  /**
   * Gets the ID of the person to own any newly created account, contact, and opportunity.
   * @return ID
   */
  global ID getOwnerID() {}

  /**
   * Gets the ID of the existing person account into which the lead will be converted.
   * @return ID
   */
  global ID getRelatedPersonAccountId() {}

  /**
   * Gets the entity record of the new person account into which the lead will be converted.
   * @return ID
   */
  global ID getRelatedPersonAccountRecord() {}

  /**
   * Indicates whether an Opportunity is created during lead conversion ( false , the default) or not ( true ).
   * @return Boolean
   */
  global Boolean isDoNotCreateOpportunity() {}

  /**
   * Indicates whether the LeadSource field on the target Contact object is overwritten with the contents of the LeadSource field in the source Lead object ( true ), or not ( false , the default).
   * @return Boolean
   */
  global Boolean isOverWriteLeadSource() {}

  /**
   * Indicates whether a notification email is sent to the owner specified by setOwnerId ( true ) or not ( false , the default).
   * @return Boolean
   */
  global Boolean isSendNotificationEmail() {}

  /**
   * Sets the ID of the account into which the lead is merged. This value is required only when updating an existing account, including person accounts.
   * @param accountId 
   */
  global void setAccountId(ID accountId) {}

  /**
   * Sets the ID of the contact into which the lead will be merged (this contact must be associated with the account specified with setAccountId , and setAccountId must be specified). This value is required only when updating an existing contact.
   * @param contactId 
   */
  global void setContactId(ID contactId) {}

  /**
   * Sets the lead status value for a converted lead. This field is required.
   * @param status 
   */
  global void setConvertedStatus(String status) {}

  /**
   * Specifies whether to create an opportunity during lead conversion. The default value is false : opportunities are created by default. Set this flag to true only if you do not want to create an opportunity from the lead.
   * @param createOpportunity 
   */
  global void setDoNotCreateOpportunity(Boolean createOpportunity) {}

  /**
   * Sets the ID of the lead to convert. This field is required.
   * @param leadId 
   */
  global void setLeadId(ID leadId) {}

  /**
   * Sets the ID of the opportunity into which the lead is merged. This value is required only when updating an existing opportunity.
   * @param opportunityId 
   */
  global void setOpportunityId(ID opportunityId) {}

  /**
   * Sets the name of the opportunity to create. If no name is specified, this value defaults to the company name of the lead.
   * @param opportunityName 
   */
  global void setOpportunityName(String opportunityName) {}

  /**
   * Specifies whether to overwrite the LeadSource field on the target contact object with the contents of the LeadSource field in the source lead object. The default value is false , to not overwrite the field. If you specify this as true , you must also specify setContactId for the target contact.
   * @param overwriteLeadSource 
   */
  global void setOverwriteLeadSource(Boolean overwriteLeadSource) {}

  /**
   * Specifies the ID of the person to own any newly created account, contact, and opportunity. If the application does not specify this value, the owner of the new object will be the owner of the lead.
   * @param ownerId 
   */
  global void setOwnerId(ID ownerId) {}

  /**
   * Sets the ID of the existing person account into which to convert the lead. This value is required only when updating an existing person account.
   * @param relatedPersonAccountId 
   */
  global void setRelatedPersonAccountId(ID relatedPersonAccountId) {}

  /**
   * Specifies whether to send a notification email to the owner specified by setOwnerId . The default value is false , that is, to not send email.
   * @param sendEmail 
   */
  global void setSendNotificationEmail(Boolean sendEmail) {}

  global SObject getAccountRecord() {}

  global Boolean getBypassAccountDedupeCheck() {}

  global Boolean getBypassContactDedupeCheck() {}

  global SObject getContactRecord() {}

  global SObject getOpportunityRecord() {}

  global void setAccountRecord(SObject arg0) {}

  global void setBypassAccountDedupeCheck(Boolean arg0) {}

  global void setBypassContactDedupeCheck(Boolean arg0) {}

  global void setContactRecord(SObject arg0) {}

  global void setOpportunityRecord(SObject arg0) {}

  global void setRelatedPersonAccountRecord(SObject arg0) {}

  global Object clone() {}

}