/**
 * Use FunctionInvocationError to get detailed error information about a failed Function invocation.
 */
public interface FunctionInvocationError {

  /**
   * Returns the error message from a Function invocation error.
   * @return String
   */
  String getMessage();

  functions.FunctionErrorType getType();

}