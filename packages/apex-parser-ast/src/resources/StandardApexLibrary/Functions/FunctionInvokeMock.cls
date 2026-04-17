/**
 * Use the FunctionInvokeMock interface to mock Salesforce Functions responses during testing.
 */
global interface FunctionInvokeMock {

  functions.FunctionInvocation respond(String functionName, String payload);

}