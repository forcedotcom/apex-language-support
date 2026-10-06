/**
 * Use the Function class to access deployed Salesforce Functions, and invoke them synchronously or asynchronously.
 * Usage
 * The Function class represents an instance of a deployed Function you can invoke from your org. You can invoke Functions synchronously, or asynchronously using asynchronous Apex.
 * If your Function takes longer than 2 minutes to return, the request times out. To avoid timing out, consider using asynchronous invocation. Invoking a Function asynchronously doesn’t count against asynchronous Apex limits, such as Apex Queueable limits.
 * Before synchronously invoking a Function, commit any pending data operations in Apex, otherwise you get a CalloutException. For asynchronous invocations, the queued invocation doesn’t happen if the Apex transaction isn’t committed. Any data operations that happen in the Function itself aren’t considered part of the Apex transaction.
 * Functions can’t be invoked in an Apex test. A “Function invocations from Apex tests are not supported” CalloutException is thrown if Apex determines that a Function is being invoked during a test. If you must run tests against code that invokes Functions, mock your Function invocations during the tests. See FunctionInvocation Example Implementation for an example of a mocked FunctionInvocation that you can use in testing.
 * Example
 * The following example synchronously invokes a deployed “accountfunction” Function:
 * functions.Function accountFunction = functions.Function.get('MyProject.accountfunction');
 * functions.FunctionInvocation invocation = accountFunction.invoke('{ "accountName" : "Acct", "contactName" : "MyContact", "opportunityName" : "Oppty" }');
 * String jsonResponse = invocation.getResponse();
 * The following example asynchronously invokes a deployed “AccountFunction” Function, using the provided callback:
 * functions.Function accountFunction = functions.Function.get('MyProject.accountfunction');
 * accountFunction.invoke('{ "accountName" : "Acct", "contactName" : "MyContact", "opportunityName" : "Oppty" }', new MyCallback());
 *
 * public class MyCallback
 *   implements functions.FunctionCallback {
 *     public void handleResponse(functions.FunctionInvocation result) {
 *       // Handle result of function invocation
 *       // ...
 *     }
 * }
 */
global class Function {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the Function instance for the named Function and Project. The Function must be properly deployed and have appropriate permissions to work with the org running your Apex code.
     * Usage
     * The Function.get() method can throw the following exceptions:
     * InvalidParameterValueException — The functionName parameter doesn’t have the correct project name.function name format.
     * NoDataFoundException — The project or Function name provided in the functionName parameter couldn’t be found. Make sure the project and Function name are spelled correctly and that the project and Function have been properly deployed.
     * @return Returns a Function instance that you can invoke.
     */
    global static functions.Function get(String projectFunctionRef) { return null; }

    /**
     * Returns the Function instance for the named Function, Project, and Namespace. The Function must be properly deployed and have appropriate permissions to work with the org running your Apex code.
     * Usage
     * The Function.get() method can throw the following exceptions:
     * InvalidParameterValueException — The functionName parameter doesn’t have the correct project name.function name format.
     * NoDataFoundException — The project or Function name provided in the functionName parameter couldn’t be found. Make sure the project and Function name are spelled correctly and that the project and Function have been properly deployed.
     * RuntimeException — The function is public yet references a function across namespaces. Make sure to retrieve references across namespaces only in a global org.
     * @return Returns a Function instance that you can invoke.
     */
    global static functions.Function get(String namespace, String projectFunctionRef) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Invokes the Function synchronously.
     * Usage
     * The Function.invoke(payload) method can throw the following exceptions:
     * CalloutException — One of the following conditions causes this exception to be thrown:
     * Salesforce Functions isn’t enabled on the current org. For more details on enabling Functions, see <a class="xref" href="https://developer.salesforce.com/docs/platform/functions/guide/config-org#enable-functions-on-dev-hub-orgs" target="_blank">Configure Orgs for Functions</a> in the Functions Developer Guide.
     * The Function is being invoked in an Apex test. Functions can’t be invoked in tests.
     * The provided payload isn’t valid JSON.
     * There are pending DML operations.
     * The Function is being synchronously invoked from an Apex trigger.
     * The Function hasn’t completed deployment to a compute environment or invocation request returns a 404 HTTP error.
     * The Function request returns a 5xx HTTP error.
     * The Function invocation has exceeded the time limit for synchronous invocations. For details on the time limit and work-arounds, see <a class="xref" href="https://developer.salesforce.com/docs/platform/functions/guide/limits#apex-limits-and-functions" target="_blank">Limits</a> in the Functions Developer Guide.
     * NoDataFoundException — A reference for the Function couldn’t be found in the current org. Make sure the project and Function have been properly deployed.
     * @return Returns a FunctionInvocation that contains information about the results of the invocation, such as the Function response, or error results.
     */
    global functions.FunctionInvocation invoke(String payload) { return null; }

    /**
     * Invokes the Function asynchronously.
     * Usage
     * The Function.invoke(payload, callback) method can throw the following exceptions:
     * CalloutException — One of the following conditions causes this exception to be thrown:
     * Salesforce Functions isn’t enabled on the current org. For more details on enabling Functions, see <a class="xref" href="https://developer.salesforce.com/docs/platform/functions/guide/config-org#enable-functions-on-dev-hub-orgs" target="_blank">Configure Orgs for Functions</a> in the Functions Developer Guide.
     * The Function is being invoked in an Apex test. Functions can’t be invoked in tests.
     * The “Functions” permission set is missing or has incorrect permissions for FunctionInvocationRequest. For more details on the correct permissions for FunctionInvocationRequest see <a class="xref" href="https://developer.salesforce.com/docs/platform/functions/guide/permissions" target="_blank">Function Permissions</a> in the Functions Developer Guide.
     * The provided payload isn’t valid JSON.
     * The Function hasn’t completed deployment to a compute environment or invocation request returns a 404 HTTP error.
     * InvalidParameterValueException — The callback parameter is null or references a class that doesn’t implement functions.FunctionCallback.
     * NoDataFoundException — A reference for the Function couldn’t be found in the current org. Make sure the project and Function have been properly deployed.
     * @return Returns a FunctionInvocation that contains information about the results of the invocation, such as the Function response, or error results.
     */
    global functions.FunctionInvocation invoke(String payload, functions.FunctionCallback callback) { return null; }

    global override virtual String toString() { return null; }
}