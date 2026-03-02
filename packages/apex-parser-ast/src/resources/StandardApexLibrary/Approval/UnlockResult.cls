/**
 * The result of a record unlock, returned by a System.Approval.unlock() method.
 */
public class UnlockResult {

  /**
   * If an error occurred, returns an array of one or more database error objects, providing the error code and description.
   * @return List<Database.Error>
   */
  public List<Database.Error> getErrors() {}

  /**
   * Returns the ID of the sObject you are trying to unlock.
   * @return Id
   */
  public Id getId() {}

  /**
   * A Boolean value that is set to true if the unlock operation is successful for this object, or false otherwise.
   * @return Boolean
   */
  public Boolean isSuccess() {}

}