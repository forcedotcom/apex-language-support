/**
 * Represents the parameter type of a batch job method and contains the batch job ID. This interface is implemented internally by Apex.
 */
public interface BatchableContext {

  /**
   * Returns the ID of the current batch job chunk that is being processed.
   * @return Id
   */
  Id getChildJobId();

  /**
   * Returns the batch job ID.
   * @return Id
   */
  Id getJobId();

}