/**
 * Use the MockFunctionInvocationFactory methods to generate appropriate mock responses for testing Salesforce Functions.
 */
global class MockFunctionInvocationFactory {

  public static functions.FunctionInvocation createErrorResponse(String invocationId, functions.FunctionErrorType functionsErrorType, String errMsg) {}

  public static functions.FunctionInvocation createSuccessResponse(String invocationId, String response) {}

}