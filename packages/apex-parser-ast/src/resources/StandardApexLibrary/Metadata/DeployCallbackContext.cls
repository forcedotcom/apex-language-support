/**
 * Represents context information for a deployment job.
 * <p>Usage
 * After an asynchronous metadata deployment finishes, Salesforce provides an instance ofMetadata.DeployCallbackContext in an asynchronous call to your implementation of handleResult() in your Metadata.DeployCallback class.
 * <p>Example
 * public void handleResult(Metadata.DeployResult result,
 *                          Metadata.DeployCallbackContext context) {
 *   // Check the callback job ID for the deployment
 *   Id jobId = context.getCallbackJobId();
 *   // ...process the results...
 * }
 */
global virtual class DeployCallbackContext {
    global Object DeployCallbackContext() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Gets the asynchronous Apex job ID for the callback job.
     */
    global virtual Id getCallbackJobId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}