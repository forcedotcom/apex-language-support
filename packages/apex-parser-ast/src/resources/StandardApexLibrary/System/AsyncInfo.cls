/**
 * Provides methods to get the current stack depth, maximum stack depth, and the minimum queueable delay for Queueable transactions, and to determine if maximum stack depth is set.
 */
global class AsyncInfo {

  global AsyncInfo() {}

  global static Integer getCurrentQueueableStackDepth() {}

  global static Integer getMaximumQueueableStackDepth() {}

  global static Integer getMinimumQueueableDelayInMinutes() {}

  global static Boolean hasMaxStackDepth() {}

  global Object clone() {}

}