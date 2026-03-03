/**
 * The result of an upsert DML operation returned by the Database. upsert method.
 */
global class UpsertResult {

  /**
   * If an error occurred, returns an array of one or more database error objects providing the error code and description. If no error occurred, returns an empty set.
   * @return Database.Error[]
   */
  public Database.Error[] getErrors() {}

  /**
   * Returns the ID of the sObject you were trying to update or insert.
   * @return ID
   */
  public ID getId() {}

  /**
   * A Boolean value that is set to true if the record was created, false if the record was updated.
   * @return Boolean
   */
  public Boolean isCreated() {}

  /**
   * Returns a Boolean value that is set to true if the DML operation was successful for this object, false otherwise.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}