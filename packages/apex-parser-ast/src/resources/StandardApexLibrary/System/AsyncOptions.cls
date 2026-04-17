/**
 * Contains maximum stack depths for queueable transactions and the minimum queueable delay in minutes. Passed as parameter to the System.enqueueJob() method to define a unique queueable job signature, the maximum stack depth for queueable transactions and the minimum queueable delay in minutes.
 */
global class AsyncOptions {

  global QueueableDuplicateSignature Class DuplicateSignature;

  global Integer MaximumQueueableStackDepth;

  global Integer MinimumQueueableDelayInMinutes;

}