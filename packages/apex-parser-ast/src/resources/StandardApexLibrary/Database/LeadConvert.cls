/**
 * Contains information used for lead conversion.
 */
global class LeadConvert {

  /**
   * Gets the ID of the account into which the lead will be merged.
   * @return ID
   */
  public ID getAccountId() {}

  /**
   * Gets the ID of the contact into which the lead will be merged.
   * @return ID
   */
  public ID getContactId() {}

  /**
   * Gets the lead status value for a converted lead.
   * @return String
   */
  public String getConvertedStatus() {}

  /**
   * Gets the ID of the lead to convert.
   * @return ID
   */
  public ID getLeadID() {}

  /**
   * Gets the ID of the existing opportunity that will be related to the resulting contact.
   * @return ID
   */
  public ID getOpportunityId() {}

  /**
   * Gets the name of the opportunity to create.
   * @return String
   */
  public String getOpportunityName() {}

  /**
   * Gets the ID of the person to own any newly created account, contact, and opportunity.
   * @return ID
   */
  public ID getOwnerID() {}

  /**
   * Gets the ID of the existing person account into which the lead will be converted.
   * @return ID
   */
  public ID getRelatedPersonAccountId() {}

  /**
   * Gets the entity record of the new person account into which the lead will be converted.
   * @return ID
   */
  public ID getRelatedPersonAccountRecord() {}

  /**
   * Indicates whether an Opportunity is created during lead conversion ( false , the default) or not ( true ).
   * @return Boolean
   */
  public Boolean isDoNotCreateOpportunity() {}

  /**
   * Indicates whether the LeadSource field on the target Contact object is overwritten with the contents of the LeadSource field in the source Lead object ( true ), or not ( false , the default).
   * @return Boolean
   */
  public Boolean isOverWriteLeadSource() {}

  /**
   * Indicates whether a notification email is sent to the owner specified by setOwnerId ( true ) or not ( false , the default).
   * @return Boolean
   */
  public Boolean isSendNotificationEmail() {}

  /**
   * Sets the ID of the account into which the lead is merged. This value is required only when updating an existing account, including person accounts.
   * @param accountId 
   */
  public void setAccountId(ID accountId) {}

  /**
   * Sets the ID of the contact into which the lead will be merged (this contact must be associated with the account specified with setAccountId , and setAccountId must be specified). This value is required only when updating an existing contact.
   * @param contactId 
   */
  public void setContactId(ID contactId) {}

  /**
   * Sets the lead status value for a converted lead. This field is required.
   * @param status 
   */
  public void setConvertedStatus(String status) {}

  /**
   * Specifies whether to create an opportunity during lead conversion. The default value is false : opportunities are created by default. Set this flag to true only if you do not want to create an opportunity from the lead.
   * @param createOpportunity 
   */
  public void setDoNotCreateOpportunity(Boolean createOpportunity) {}

  /**
   * Sets the ID of the lead to convert. This field is required.
   * @param leadId 
   */
  public void setLeadId(ID leadId) {}

  /**
   * Sets the ID of the opportunity into which the lead is merged. This value is required only when updating an existing opportunity.
   * @param opportunityId 
   */
  public void setOpportunityId(ID opportunityId) {}

  /**
   * Sets the name of the opportunity to create. If no name is specified, this value defaults to the company name of the lead.
   * @param opportunityName 
   */
  public void setOpportunityName(String opportunityName) {}

  /**
   * Specifies whether to overwrite the LeadSource field on the target contact object with the contents of the LeadSource field in the source lead object. The default value is false , to not overwrite the field. If you specify this as true , you must also specify setContactId for the target contact.
   * @param overwriteLeadSource 
   */
  public void setOverwriteLeadSource(Boolean overwriteLeadSource) {}

  /**
   * Specifies the ID of the person to own any newly created account, contact, and opportunity. If the application does not specify this value, the owner of the new object will be the owner of the lead.
   * @param ownerId 
   */
  public void setOwnerId(ID ownerId) {}

  /**
   * Sets the ID of the existing person account into which to convert the lead. This value is required only when updating an existing person account.
   * @param relatedPersonAccountId 
   */
  public void setRelatedPersonAccountId(ID relatedPersonAccountId) {}

  /**
   * Specifies whether to send a notification email to the owner specified by setOwnerId . The default value is false , that is, to not send email.
   * @param sendEmail 
   */
  public void setSendNotificationEmail(Boolean sendEmail) {}

}