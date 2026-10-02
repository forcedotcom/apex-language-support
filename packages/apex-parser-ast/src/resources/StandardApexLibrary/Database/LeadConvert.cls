/**
 * Contains information used for lead conversion.
 * <p>Usage
 * The convertLead Database method converts a lead into an account and contact or an account and person account, as well as (optionally) an opportunity. The convertLead takes an instance of the Database.LeadConvert class as a parameter. Create an instance of this class and set the information required for conversion, such as setting the lead, and destination account and contact.
 * Note
 * The Database.convertLead() method can take one LeadConvert object or a list of LeadConvert objects.
 * <p>Example
 * This example shows how to use the Database.convertLead method to convert a lead. It inserts a new lead, creates a LeadConvert object, sets its status to converted, then passes it to the Database.convertLead method. Finally, it verifies that the conversion was successful.
 * Lead myLead = new Lead(LastName = 'Fry', Company='Fry And Sons');
 * insert as user myLead;
 *
 * Database.LeadConvert lc = new Database.LeadConvert();
 * lc.setLeadId(myLead.id);
 *
 * LeadStatus convertStatus = [SELECT Id, ApiName FROM LeadStatus WHERE IsConverted=true WITH USER_MODE LIMIT 1];
 * lc.setConvertedStatus(convertStatus.ApiName);
 *
 * Database.LeadConvertResult lcr = Database.convertLead(lc, AccessLevel.USER_MODE);
 * Assert.isTrue(lcr.isSuccess());
 */
global class LeadConvert {
    global Id accountid { get; set; }
    global SObject accountrecord { get; set; }
    global Boolean bypassaccountdedupecheck { get; set; }
    global Boolean bypasscontactdedupecheck { get; set; }
    global Id contactid { get; set; }
    global SObject contactrecord { get; set; }
    global String convertedstatus { get; set; }
    global Boolean donotcreateopportunity { get; set; }
    global Id leadid { get; set; }
    global Id opportunityid { get; set; }
    global String opportunityname { get; set; }
    global SObject opportunityrecord { get; set; }
    global Boolean overwriteleadsource { get; set; }
    global Id ownerid { get; set; }
    global Id relatedpersonaccountid { get; set; }
    global SObject relatedpersonaccountrecord { get; set; }
    global Boolean sendnotificationemail { get; set; }

    /**
     * Creates a new instance of the Database.LeadConvert class.
     */
    Object LeadConvert() { return null; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Gets the ID of the account into which the lead will be merged.
     */
    global Id getAccountId() { return null; }

    global SObject getAccountRecord() { return null; }

    global Boolean getBypassAccountDedupeCheck() { return false; }

    global Boolean getBypassContactDedupeCheck() { return false; }

    /**
     * Gets the ID of the contact into which the lead will be merged.
     */
    global Id getContactId() { return null; }

    global SObject getContactRecord() { return null; }

    /**
     * Gets the lead status value for a converted lead.
     */
    global String getConvertedStatus() { return null; }

    /**
     * Gets the ID of the lead to convert.
     */
    global Id getLeadId() { return null; }

    /**
     * Gets the ID of the existing opportunity that will be related to the resulting contact.
     */
    global Id getOpportunityId() { return null; }

    /**
     * Gets the name of the opportunity to create.
     */
    global String getOpportunityName() { return null; }

    global SObject getOpportunityRecord() { return null; }

    /**
     * Gets the ID of the person to own any newly created account, contact, and opportunity.
     */
    global Id getOwnerId() { return null; }

    /**
     * Gets the ID of the existing person account into which the lead will be converted.
     */
    global Id getRelatedPersonAccountId() { return null; }

    global SObject getRelatedPersonAccountRecord() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Indicates whether an Opportunity is created during lead conversion (false, the default) or not (true).
     */
    global Boolean isDoNotCreateOpportunity() { return false; }

    /**
     * Indicates whether the LeadSource field on the target Contact object is overwritten with the contents of the LeadSource field in the source Lead object (true), or not (false, the default).
     */
    global Boolean isOverwriteLeadSource() { return false; }

    /**
     * Indicates whether a notification email is sent to the owner specified by setOwnerId (true) or not (false, the default).
     */
    global Boolean isSendNotificationEmail() { return false; }

    /**
     * Sets the ID of the account into which the lead is merged. This value is required only when updating an existing account, including person accounts.
     */
    global void setAccountId(Id param1) { }

    global void setAccountRecord(SObject param1) { }

    global void setBypassAccountDedupeCheck(Boolean param1) { }

    global void setBypassContactDedupeCheck(Boolean param1) { }

    /**
     * Sets the ID of the contact into which the lead will be merged (this contact must be associated with the account specified with setAccountId, and setAccountId must be specified). This value is required only when updating an existing contact.
     * <p>Usage
     * If setContactId is specified, then the application creates a new contact that is implicitly associated with the account. The contact name and other existing data are not overwritten (unless setOverwriteLeadSource is set to true, in which case only the LeadSource field is overwritten).
     * Important
     * If you are converting a lead into a person account, do not specify setContactId or an error will result. Specify only setAccountId of the person account.
     */
    global void setContactId(Id param1) { }

    global void setContactRecord(SObject param1) { }

    /**
     * Sets the lead status value for a converted lead. This field is required.
     */
    global void setConvertedStatus(String param1) { }

    /**
     * Specifies whether to create an opportunity during lead conversion. The default value is false: opportunities are created by default. Set this flag to true only if you do not want to create an opportunity from the lead.
     */
    global void setDoNotCreateOpportunity(Boolean param1) { }

    /**
     * Sets the ID of the lead to convert. This field is required.
     */
    global void setLeadId(Id param1) { }

    /**
     * Sets the ID of the opportunity into which the lead is merged. This value is required only when updating an existing opportunity.
     */
    global void setOpportunityId(Id param1) { }

    /**
     * Sets the name of the opportunity to create. If no name is specified, this value defaults to the company name of the lead.
     * <p>Usage
     * The maximum length of this field is 80 characters.
     * If setDoNotCreateOpportunity is true, no Opportunity is created and this field must be left blank; otherwise, an error is returned.
     */
    global void setOpportunityName(String param1) { }

    global void setOpportunityRecord(SObject param1) { }

    /**
     * Specifies whether to overwrite the LeadSource field on the target contact object with the contents of the LeadSource field in the source lead object. The default value is false, to not overwrite the field. If you specify this as true, you must also specify setContactId for the target contact.
     */
    global void setOverwriteLeadSource(Boolean param1) { }

    /**
     * Specifies the ID of the person to own any newly created account, contact, and opportunity. If the application does not specify this value, the owner of the new object will be the owner of the lead.
     * <p>Usage
     * This method is not applicable when merging with existing objects—if setOwnerId is specified, the ownerId field is not overwritten in an existing account or contact.
     */
    global void setOwnerId(Id param1) { }

    /**
     * Sets the ID of the existing person account into which to convert the lead. This value is required only when updating an existing person account.
     */
    global void setRelatedPersonAccountId(Id param1) { }

    global void setRelatedPersonAccountRecord(SObject param1) { }

    /**
     * Specifies whether to send a notification email to the owner specified by setOwnerId. The default value is false, that is, to not send email.
     */
    global void setSendNotificationEmail(Boolean param1) { }

    global String toString() { return null; }
}