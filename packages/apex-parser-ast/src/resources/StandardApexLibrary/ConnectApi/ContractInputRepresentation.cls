/**
 * Input to create and update contract.
 */
global class ContractInputRepresentation {

  global ContractInputRepresentation() {}

  /**
   * Specifies whether automatic document generation is required or not.
   */
  global Boolean isAutoDocgenRequired;

  /**
   * Contract record type name.
   */
  global String recordTypeName;

  /**
   * Source record ID.
   */
  global String sourceObjectId;

  /**
   * Document template name for document generation.
   */
  global String templateName;

  global Object clone() {}

}