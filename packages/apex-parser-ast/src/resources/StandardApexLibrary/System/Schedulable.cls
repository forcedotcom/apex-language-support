/**
 * The class that implements this interface can be scheduled to run at different intervals.
 */
global interface Schedulable {

  /**
   * Executes the scheduled Apex job.
   * @param context Contains the job ID.
   */
  void execute(SchedulableContext context);

}