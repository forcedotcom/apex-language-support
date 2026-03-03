/**
 * Provides methods to get the current stack depth, maximum stack depth, and the minimum queueable delay for Queueable transactions, and to determine if maximum stack depth is set.
 */
global class AsyncInfo {

  public static Integer getCurrentQueueableStackDepth() {}

  public static Integer getMaximumQueueableStackDepth() {}

  public static Integer getMinimumQueueableDelayInMinutes() {}

  public static Boolean hasMaxStackDepth() {}

}