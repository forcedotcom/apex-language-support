/**
 * Contains methods that reorder batch jobs in the Apex flex queue.
 */
global class FlexQueue {

  /**
   * Moves the job with the ID jobToMoveId immediately after the job with the ID jobInQueueId in the flex queue. You can move jobToMoveId forward or backward in the queue. If either job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if jobToMoveId is already immediately after jobInQueueId , so no change is made.
   * @param jobToMoveId The ID of the job to move.
   * @param jobInQueueId The ID of the job to move after.
   * @return Boolean
   */
  public static Boolean moveAfterJob(Id jobToMoveId, Id jobInQueueId) {}

  /**
   * Moves the job with the ID jobToMoveId immediately before the job with the ID jobInQueueId in the flex queue. You can move jobToMoveId forward or backward in the queue. If either job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if jobToMoveId is already immediately before jobInQueueId , so no change is made.
   * @param jobToMoveId The ID of the job to move.
   * @param jobInQueueId The ID of the job to use as a reference point.
   * @return Boolean
   */
  public static Boolean moveBeforeJob(Id jobToMoveId, Id jobInQueueId) {}

  /**
   * Moves the specified job the end of the flex queue, to index position (size - 1) . All jobs after the job’s starting position move one spot forward. If the job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if the job is already at the end of the queue, so no change is made.
   * @param jobId The ID of the job to move.
   * @return Boolean
   */
  public static Boolean moveJobToEnd(Id jobId) {}

  /**
   * Moves the specified job to the front of the flex queue, to index position 0 . All other jobs move back one spot. If the job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if the job is already at the front of the queue, so no change is made.
   * @param jobId The ID of the job to move.
   * @return Boolean
   */
  public static Boolean moveJobToFront(Id jobId) {}

}