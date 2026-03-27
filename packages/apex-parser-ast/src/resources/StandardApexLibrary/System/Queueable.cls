/**
 * Enables the asynchronous execution of Apex jobs that can be monitored.
 */
global interface Queueable {

  /**
   * Executes the queueable job.
   * @param context Contains the job ID.
   */
  void execute(QueueableContext context);

}