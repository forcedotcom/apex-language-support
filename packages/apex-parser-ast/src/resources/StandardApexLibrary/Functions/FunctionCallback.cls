/**
 * Represents the callback Salesforce calls when an asynchronous, queued Function invocation has completed.
 * <p>Usage
 * When invoking Functions asynchronously via Function.invoke(payload, callback), you provide your own class that implements FunctionCallback.
 */
global interface FunctionCallback {
    virtual Boolean equals(Object arg0);

    /**
     * Called when an asynchronous Function invocation has completed.
     */
    abstract void handleResponse(functions.FunctionInvocation result);

    virtual Integer hashCode();

    virtual String toString();
}