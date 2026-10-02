/**
 * Represents the parameter type of the execute method in a class that implements the Finalizer interface. This interface is implemented internally by Apex. The System.FinalizerContext interface contains four methods: getAsyncApexJobId, getRequestId, getResult, and getException. An instance of System.FinalizerContext is injected by the Apex runtime engine as an argument to the Finalizer.execute method.
 */
global interface FinalizerContext {
    virtual Boolean equals(Object arg0);

    /**
     * Returns the ID of the Queueable job for which this finalizer is defined.
     */
    abstract Id getAsyncApexJobId();

    /**
     * Returns the exception with which the Queueable job failed when getResult is UNHANDLED_EXCEPTION, null otherwise.
     */
    abstract Exception getException();

    /**
     * Returns the request ID that can be correlated with Event Monitoring logs. To correlate the request with the AsyncApexJob table, use the getAsyncApexJobId method instead. The Queueable job and the Finalizer execution share the same request ID.
     */
    abstract String getRequestId();

    /**
     * Returns the System.ParentJobResult enum, which represents the result of the parent asynchronous Apex Queueable job to which the finalizer is attached. The enum takes these values: SUCCESS, UNHANDLED_EXCEPTION.
     */
    abstract System.ParentJobResult getResult();

    virtual Integer hashCode();

    virtual String toString();
}