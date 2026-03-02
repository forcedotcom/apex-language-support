/**
 * The result of the emptyRecycleBin DML operation returned by the Database.emptyRecycleBin method.
 */
public class EmptyRecycleBinResult {

  /**
   * If an error occurred during the delete for this record or sObject, returns a list of one or more Database.Error objects. If no errors occurred, the returned list is empty.
   * @return Database.Errors[]
   */
  public Database.Errors[] getErrors() {}

  /**
   * Returns the ID of the record or sObject you attempted to delete.
   * @return ID
   */
  public ID getId() {}

  /**
   * Returns true if the record or sObject was successfully removed from the Recycle Bin; otherwise false .
   * @return Boolean
   */
  public Boolean isSuccess() {}

}