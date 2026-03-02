/**
 * The result of an undelete DML operation returned by the Database. undelete method.
 */
public class UndeleteResult {

  /**
   * If an error occurred, returns an array of one or more database error objects providing the error code and description. If no error occurred, returns null.
   * @return Database.Error[]
   */
  public Database.Error[] getErrors() {}

  /**
   * Returns the ID of the sObject you were trying to undelete.
   * @return ID
   */
  public ID getId() {}

  /**
   * Returns a Boolean value that is set to true if the DML operation was successful for this object, false otherwise.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}