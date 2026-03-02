/**
 * The class that implements this interface can be executed as a batch Apex job.
 */
public interface Batchable {

  /**
   * Gets invoked when the batch job executes and operates on one batch of records. Contains or calls the main execution logic for the batch job.
   * @param jobId Contains the job ID.
   * @param recordList Contains the batch of records to process.
   * @return Void
   */
  Void execute(Database.BatchableContext jobId, List<sObject> recordList);

  /**
   * Gets invoked when the batch job finishes. Place any clean up code in this method.
   * @param jobId Contains the job ID.
   * @return Void
   */
  Void finish(Database.BatchableContext jobId);

  /**
   * Gets invoked when the batch job starts. Returns the record set as an iterable that will be batched for execution.
   * @param jobId Contains the job ID.
   * @return System.Iterable
   */
  System.Iterable start(Database.BatchableContext jobId);

  /**
   * Gets invoked when the batch job starts. Returns the record set as an iterable that will be batched for execution.
   * @param jobId Contains the job ID.
   * @return Database.QueryLocator
   */
  Database.QueryLocator start(Database.BatchableContext jobId);

}