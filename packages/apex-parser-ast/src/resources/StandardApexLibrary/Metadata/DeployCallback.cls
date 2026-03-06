/**
 * An interface for metadata deployment callback classes.
 */
global interface DeployCallback {

  /**
   * Method that is called when the asynchronous deployment of custom metadata completes.
   * @param var1 The results of the asynchronous deployment.
   * @param var2 The context for the queued asynchronous deployment job.
   */
  void handleResult(Metadata.DeployResult var1, Metadata.DeployCallbackContext var2);

}