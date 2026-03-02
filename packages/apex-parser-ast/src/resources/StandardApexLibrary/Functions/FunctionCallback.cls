/**
 * Represents the callback Salesforce calls when an asynchronous, queued Function invocation has completed.
 */
public interface FunctionCallback {

  /**
   * Called when an asynchronous Function invocation has completed.
   * @param var1 The result parameter contains JSON response information and error information.
   */
  void handleResponse(functions.FunctionInvocation var1);

}