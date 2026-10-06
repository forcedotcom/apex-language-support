/**
 * Use the MockFunctionInvocationFactory methods to generate appropriate mock responses for testing Salesforce Functions.
 * Usage
 * To mock Salesforce Functions testing, implement an appropriate mock response in the respond(functionName,payload) method of the FunctionInvokeMock interface. During mock testing of a Salesforce Functions, the Apex runtime sends the response specified in the respond() method, rather than invoking the function itself. Appropriate success and error messages can be configured with the createSuccessResponse(invocationId,message) and createErrorResponse(invocationId,functionsErrorType,errorMsg) methods.
 * See FunctionInvokeMock Example Implementation.
 */
global class MockFunctionInvocationFactory {
    global MockFunctionInvocationFactory() { }

    /**
     * Generate a response for an error condition during mock testing of Salesforce Functions.
     */
    global static functions.FunctionInvocation createErrorResponse(String invocationId, functions.FunctionErrorType functionsErrorType, String errMsg) { return null; }

    /**
     * Generate a response for a successful mock test of Salesforce Functions.
     */
    global static functions.FunctionInvocation createSuccessResponse(String invocationId, String response) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}