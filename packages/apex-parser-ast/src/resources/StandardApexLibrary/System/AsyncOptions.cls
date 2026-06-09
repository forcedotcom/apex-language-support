/**
 * Contains maximum stack depths for queueable transactions and the minimum queueable delay in minutes. Passed as parameter to the System.enqueueJob() method to define a unique queueable job signature, the maximum stack depth for queueable transactions and the minimum queueable delay in minutes.
 */
global class AsyncOptions {

  global AsyncOptions() {}

  global System.QueueableDuplicateSignature DuplicateSignature;

  global Integer MaximumQueueableStackDepth;

  global Integer MinimumQueueableDelayInMinutes;

  global Object clone() {}

}