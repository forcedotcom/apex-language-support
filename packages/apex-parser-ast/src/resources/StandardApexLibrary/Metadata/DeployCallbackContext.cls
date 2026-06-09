/**
 * Represents context information for a deployment job.
 */
global class DeployCallbackContext {

  global DeployCallbackContext() {}

  /**
   * Makes a duplicate copy of the Metadata.DeployCallbackContext .
   * @return Object
   */
  global Object clone() {}

  /**
   * Gets the asynchronous Apex job ID for the callback job.
   * @return Id
   */
  global Id getCallbackJobId() {}

}