/**
 * Contains methods that reorder batch jobs in the Apex flex queue.
 * Usage
 * You can place up to 100 batch jobs in a holding status for future execution. When system resources become available, the jobs are taken from the top of the Apex flex queue and moved to the batch job queue. Up to five queued or active jobs can be processed simultaneously for each org. When a job is moved out of the flex queue for processing, its status changes from Holding to Queued. Queued jobs are executed when the system is ready to process new jobs.
 * Use this class’s methods to reorder your Holding jobs in the flex queue. As best practice and for safe usage, a FlexQueue reorder method must be the final statement in a transaction.
 * Example
 * This example moves a job to the front of the flex queue so that it’s executed immediately. The job is moved by calling the System.FlexQueue.moveJobToFront() method with the high priority job ID as the parameter.
 * ID highPriorityJobId = Database.executeBatch(new HighPriorityBatchClass(), 200);
 * boolean jobMovedToFrontOfQueue = FlexQueue.moveJobToFront(highPriorityJobId);
 */
global class FlexQueue {
    /**
     * Moves the job with the ID jobToMoveId immediately after the job with the ID jobInQueueId in the flex queue. You can move jobToMoveId forward or backward in the queue. If either job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if jobToMoveId is already immediately after jobInQueueId, so no change is made.
     */
    global static Boolean moveAfterJob(Id jobToMoveId, Id jobInQueueId) { return false; }

    /**
     * Moves the job with the ID jobToMoveId immediately before the job with the ID jobInQueueId in the flex queue. You can move jobToMoveId forward or backward in the queue. If either job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if jobToMoveId is already immediately before jobInQueueId, so no change is made.
     */
    global static Boolean moveBeforeJob(Id jobToMoveId, Id jobInQueueId) { return false; }

    /**
     * Moves the specified job the end of the flex queue, to index position (size - 1). All jobs after the job’s starting position move one spot forward. If the job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if the job is already at the end of the queue, so no change is made.
     */
    global static Boolean moveJobToEnd(Id jobId) { return false; }

    /**
     * Moves the specified job to the front of the flex queue, to index position 0. All other jobs move back one spot. If the job isn’t in the queue, it throws an element-not-found exception. Returns true if the job is moved, or false if the job is already at the front of the queue, so no change is made.
     */
    global static Boolean moveJobToFront(Id jobId) { return false; }
}