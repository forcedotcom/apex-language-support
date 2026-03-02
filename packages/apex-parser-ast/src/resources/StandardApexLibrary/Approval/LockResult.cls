/**
 * The result of a record lock returned by a System.Approval.lock() method.
 */
public class LockResult {

  /**
   * If an error occurred, returns an array of one or more database error objects, providing the error code and description.
   * @return List<Database.Error>
   */
  public List<Database.Error> getErrors() {}

  /**
   * Returns the ID of the sObject you are trying to lock.
   * @return Id
   */
  public Id getId() {}

  /**
   * A Boolean value that is set to true if the lock operation is successful for this object, or false otherwise.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}