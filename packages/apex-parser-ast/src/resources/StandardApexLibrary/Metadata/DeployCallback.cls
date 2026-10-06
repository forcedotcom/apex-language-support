/**
 * An interface for metadata deployment callback classes.
 * Usage
 * You must provide a callback class for the asynchronous deployment of custom metadata through Apex. This class must implement the Metadata.DeployCallback interface.
 * Salesforce calls your DeployCallback.handleResult() method asynchronously once the queued deployment completes. Because the callback is called as asynchronous Apex after deployment, there may be a brief period where the deploy has completed, but your callback has not been called yet.
 */
global interface DeployCallback {
    virtual Boolean equals(Object arg0);

    /**
     * Method that is called when the asynchronous deployment of custom metadata completes.
     */
    abstract void handleResult(Metadata.DeployResult result, Metadata.DeployCallbackContext context);

    virtual Integer hashCode();

    virtual String toString();
}