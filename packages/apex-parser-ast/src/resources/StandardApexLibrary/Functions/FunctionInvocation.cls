/**
 * Use FunctionInvocation to get the status and results of a synchronous or asynchronous Function invocation.
 */
public interface FunctionInvocation {

  /**
   * Returns error information for a Function invocation.
   * @return functions.FunctionInvocationError
   */
  functions.FunctionInvocationError getError();

  /**
   * Returns the invocation ID of the Function invocation.
   * @return String
   */
  String getInvocationId();

  /**
   * Returns the response string of the Function invocation.
   * @return String
   */
  String getResponse();

  /**
   * Returns the status of the Function invocation.
   * @return functions.FunctionInvocationStatus
   */
  functions.FunctionInvocationStatus getStatus();

}