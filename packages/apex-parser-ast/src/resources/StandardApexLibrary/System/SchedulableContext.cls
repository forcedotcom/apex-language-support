/**
 * Represents the parameter type of a method in a class that implements the Schedulable interface and contains the scheduled job ID. This interface is implemented internally by Apex.
 */
public interface SchedulableContext {

  /**
   * Returns the ID of the CronTrigger scheduled job.
   * @return Id
   */
  Id getTriggerId();

}