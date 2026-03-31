/**
 * A callback class that the Database.insertAsync or Database.updateAsync method references. Salesforce calls this class after the remote operation is completed. This class provides the compensating transaction in the completion context of the insert or update operation. Extend this class to define the actions to execute after the remote insert or update operation finishes execution.
 */
global class AsyncSaveCallback {

  /**
   * Override this method to define actions that Salesforce executes after the remote Database.insertAsync or Database.updateAsync operation is completed. For example, based on the results of the remote operation, you can update custom object data or other data that's stored in the Salesforce org.
   * @param saveResult The result of the asynchronous insert or update operation.
   */
  public void processSave(Database.SaveResult saveResult) {}

}