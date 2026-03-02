/**
 * The class that implements this interface can be scheduled to run at different intervals.
 */
public interface Schedulable {

  /**
   * Executes the scheduled Apex job.
   * @param context Contains the job ID.
   * @return Void
   */
  Void execute(SchedulableContext context);

}