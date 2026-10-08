/**
 * A callback class that the Database.insertAsync or Database.updateAsync method references. Salesforce calls this class after the remote operation is completed. This class provides the compensating transaction in the completion context of the insert or update operation. Extend this class to define the actions to execute after the remote insert or update operation finishes execution.
 */
global abstract class AsyncSaveCallback implements DataSource.IAsyncSaveCallback {
    global AsyncSaveCallback() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Override this method to define actions that Salesforce executes after the remote Database.insertAsync or Database.updateAsync operation is completed. For example, based on the results of the remote operation, you can update custom object data or other data that's stored in the Salesforce org.
     */
    global virtual void processSave(Database.SaveResult saveResult) { }

    global override virtual String toString() { return null; }
}