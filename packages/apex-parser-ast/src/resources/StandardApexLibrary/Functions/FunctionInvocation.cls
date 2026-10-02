/**
 * Use FunctionInvocation to get the status and results of a synchronous or asynchronous Function invocation.
 * <p>Usage
 * The results of a Function invocation are passed back via FunctionInvocation. Use this instance to determine if the invocation was successful, and any results from the Function invocation.
 * You can also implement your own FunctionInvocation interface if you run Apex tests with your Function invocation code. Your test code can create and use your own FunctionInvocation instance in place of using the results from a call to Function.invoke().
 */
global interface FunctionInvocation {
    virtual Boolean equals(Object arg0);

    /**
     * Returns error information for a Function invocation.
     * @return Contains a FunctionInvocationError instance that you can use to get information about any invocation errors. If the Function was invoked successfully, the returned instance is null.
     */
    abstract functions.FunctionInvocationError getError();

    /**
     * Returns the invocation ID of the Function invocation.
     * @return This ID is available after a call to either the synchronous or asynchronous Function.invoke() methods. For asynchronous invocations, this ID can be used to check the status of the queued invocation.
     */
    abstract String getInvocationId();

    /**
     * Returns the response string of the Function invocation.
     * @return The response string is the raw request JSON response, which can be parsed using the JSONParser Class.
     */
    abstract String getResponse();

    /**
     * Returns the status of the Function invocation.
     * @return The result of the invocation, such as FunctionInvocationStatus.SUCCESS or FunctionInvocationStatus.ERROR.
     */
    abstract functions.FunctionInvocationStatus getStatus();

    virtual Integer hashCode();

    virtual String toString();
}