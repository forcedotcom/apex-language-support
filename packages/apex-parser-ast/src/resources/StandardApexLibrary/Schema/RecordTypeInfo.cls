/**
 * Contains methods for accessing record type information for an sObject with associated record types.
 */
global class RecordTypeInfo {

  /**
   * Returns the developer name for this record type.
   * @return String
   */
  public String getDeveloperName() {}

  /**
   * Returns the UI label of this record type. The label can be translated into any language that Salesforce supports.
   * @return String
   */
  public String getName() {}

  /**
   * Returns the ID of this record type.
   * @return ID
   */
  public ID getRecordTypeId() {}

  /**
   * Returns true if this record type is active, false otherwise.
   * @return Boolean
   */
  public Boolean isActive() {}

  /**
   * Returns true if this record type is available to the current user, false otherwise. Use this method to display a list of available record types to the user when he or she is creating a new record.
   * @return Boolean
   */
  public Boolean isAvailable() {}

  /**
   * Returns true if this is the default record type for the user, false otherwise.
   * @return Boolean
   */
  public Boolean isDefaultRecordTypeMapping() {}

  /**
   * Returns true if this is the master record type and false otherwise. The master record type is the default record type that’s used when a record has no custom record type associated with it.
   * @return Boolean
   */
  public Boolean isMaster() {}

}