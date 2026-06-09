/**
 * Use the MockFunctionInvocationFactory methods to generate appropriate mock responses for testing Salesforce Functions.
 */
global class MockFunctionInvocationFactory {

  global MockFunctionInvocationFactory() {}

  global static functions.FunctionInvocation createErrorResponse(String invocationId, functions.FunctionErrorType functionsErrorType, String errMsg) {}

  global static functions.FunctionInvocation createSuccessResponse(String invocationId, String response) {}

  global Object clone() {}

}