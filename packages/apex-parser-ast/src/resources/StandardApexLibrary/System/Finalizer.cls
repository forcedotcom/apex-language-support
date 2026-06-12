/**
 * Use this interface to attach actions that are executed at the end of asynchronous Queueable job executions. A specific use case is to design recovery actions when a Queueable job fails.
 */
global interface Finalizer {

  void execute(System.FinalizerContext finalizerContext);

}