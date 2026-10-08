/**
 * Use this interface to attach actions that are executed at the end of asynchronous Queueable job executions. A specific use case is to design recovery actions when a Queueable job fails.
 * Usage
 * The execute method is called on the provided Finalizer instance for every enqueued job that has an attached finalizer. Within the execute method, you can define the actions to be taken at the end of the Queueable job. An instance of System.FinalizerContext is injected by the Apex runtime engine as an argument to the execute method.
 */
global interface Finalizer {
    virtual Boolean equals(Object arg0);

    /**
     * The execute method is called on the provided Finalizer instance for every enqueued job that has an attached finalizer. Within the execute method, you can define the actions to be taken at the end of the Queueable job.
     */
    abstract void execute(System.FinalizerContext finalizerCtx);

    virtual Integer hashCode();

    virtual String toString();
}