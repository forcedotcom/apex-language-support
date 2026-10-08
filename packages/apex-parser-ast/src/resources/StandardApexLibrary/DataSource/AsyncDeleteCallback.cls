/**
 * A callback class that the Database.deleteAsync method references. Salesforce calls this class after the remote deleteAsync operation is completed. This class provides the compensating transaction in the completion context of the delete operation. Extend this class to define the actions to execute after the remote delete operation finishes execution.
 */
global virtual class AsyncDeleteCallback implements DataSource.IAsyncDeleteCallback {
    global AsyncDeleteCallback() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Override this method to define actions that Salesforce executes after a remote Database.deleteAsync operation is completed. For example, based on the results of the remote operation, you can update custom object data or other data that's stored in the Salesforce org..
     */
    global virtual void processDelete(Database.DeleteResult deleteResult) { }

    global override virtual String toString() { return null; }
}