/**
 * The result of an insert or update DML operation returned by a Database method.
 */
public class SaveResult {

  /**
   * If an error occurred, returns an array of one or more database error objects providing the error code and description. If no error occurred, returns an empty set.
   * @return Database.Error[]
   */
  public Database.Error[] getErrors() {}

  /**
   * Returns the ID of the sObject you were trying to insert or update.
   * @return ID
   */
  public ID getId() {}

  /**
   * Returns a Boolean that is set to true if the DML operation was successful for this object, false otherwise.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}