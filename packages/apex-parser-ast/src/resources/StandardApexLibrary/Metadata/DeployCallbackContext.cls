/**
 * Represents context information for a deployment job.
 */
global class DeployCallbackContext {

  /**
   * Makes a duplicate copy of the Metadata.DeployCallbackContext .
   * @return Object
   */
  public Object clone() {}

  /**
   * Gets the asynchronous Apex job ID for the callback job.
   * @return Id
   */
  public Id getCallbackJobId() {}

}