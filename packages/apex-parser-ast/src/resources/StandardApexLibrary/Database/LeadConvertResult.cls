/**
 * The result of a lead conversion.
 * Usage
 * An array of LeadConvertResult objects is returned with the convertLead Database method. Each element in the LeadConvertResult array corresponds to the sObject array passed as the SObject[] parameter in the convertLead Database method, that is, the first element in the LeadConvertResult array matches the first element passed in the SObject array, the second element corresponds to the second element, and so on. If only one sObject is passed in, the LeadConvertResult array contains a single element.
 */
global class LeadConvertResult {
    global Id accountid { get; }
    global Id contactid { get; }
    global List errors { get; }
    global Id leadid { get; }
    global Id opportunityid { get; }
    global Id relatedpersonaccountid { get; }
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * The ID of the new account (if a new account was specified) or the ID of the account specified when convertLead was invoked.
     */
    global Id getAccountId() { return null; }

    /**
     * The ID of the new contact (if a new contact was specified) or the ID of the contact specified when convertLead was invoked.
     */
    global Id getContactId() { return null; }

    /**
     * If an error occurred, an array of one or more database error objects providing the error code and description.
     */
    global List getErrors() { return null; }

    /**
     * The ID of the converted lead.
     */
    global Id getLeadId() { return null; }

    /**
     * The ID of the new opportunity, if one was created when convertLead was invoked.
     */
    global Id getOpportunityId() { return null; }

    /**
     * The ID of the new or existing person account specified when convertLead was invoked.
     */
    global Id getRelatedPersonAccountId() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * A Boolean value that is set to true if the DML operation was successful for this object, false otherwise
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}