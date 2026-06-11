/**
 * Represents the parameter type of the execute method in a class that implements the Finalizer interface. This interface is implemented internally by Apex. The System.FinalizerContext interface contains four methods: getAsyncApexJobId , getRequestId , getResult , and getException . An instance of System.FinalizerContext is injected by the Apex runtime engine as an argument to the Finalizer.execute method.
 */
global interface FinalizerContext {

  Id getAsyncApexJobId();

  Exception getException();

  String getRequestId();

  System.ParentJobResult getResult();

}