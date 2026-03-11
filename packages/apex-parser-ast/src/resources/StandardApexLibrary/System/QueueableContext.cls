/**
 * Represents the parameter type of the execute() method in a class that implements the Queueable interface and contains the job ID. This interface is implemented internally by Apex.
 */
global interface QueueableContext {

  /**
   * Returns the ID of the submitted job that uses the Queueable interface.
   * @return ID
   */
  ID getJobId();

}