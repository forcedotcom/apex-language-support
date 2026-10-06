/**
 * Use FunctionInvocationError to get detailed error information about a failed Function invocation.
 * Usage
 * FunctionInvocationError contains various error information such as the error message at the time of the error.
 */
global interface FunctionInvocationError {
    virtual Boolean equals(Object arg0);

    /**
     * Returns the error message from a Function invocation error.
     */
    abstract String getMessage();

    /**
     * Returns the error type for FunctionInvocationError.
     */
    abstract functions.FunctionErrorType getType();

    virtual Integer hashCode();

    virtual String toString();
}