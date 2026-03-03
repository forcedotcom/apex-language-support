/**
 * The result of a lead conversion.
 */
global class LeadConvertResult {

  /**
   * The ID of the new account (if a new account was specified) or the ID of the account specified when convertLead was invoked.
   * @return ID
   */
  public ID getAccountId() {}

  /**
   * The ID of the new contact (if a new contact was specified) or the ID of the contact specified when convertLead was invoked.
   * @return ID
   */
  public ID getContactId() {}

  /**
   * If an error occurred, an array of one or more database error objects providing the error code and description.
   * @return Database.Error[]
   */
  public Database.Error[] getErrors() {}

  /**
   * The ID of the converted lead.
   * @return ID
   */
  public ID getLeadId() {}

  /**
   * The ID of the new opportunity, if one was created when convertLead was invoked.
   * @return ID
   */
  public ID getOpportunityId() {}

  /**
   * The ID of the new or existing person account specified when convertLead was invoked.
   * @return ID
   */
  public ID getRelatedPersonAccountId() {}

  /**
   * A Boolean value that is set to true if the DML operation was successful for this object, false otherwise
   * @return Boolean
   */
  public Boolean isSuccess() {}

}