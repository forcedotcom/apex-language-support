/**
 * Provides methods to get the current stack depth, maximum stack depth, and the minimum queueable delay for Queueable transactions, and to determine if maximum stack depth is set.
 */
global class AsyncInfo {
    global Object AsyncInfo() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Get the current queueable stack depth for queueable transactions.
     */
    global static Integer getCurrentQueueableStackDepth() { return 0; }

    /**
     * Get the maximum queueable stack depth for queueable transactions.
     */
    global static Integer getMaximumQueueableStackDepth() { return 0; }

    /**
     * Get the minimum queueable delay for queueable transactions (in minutes).
     * @return Returns null if no delay is defined.
     */
    global static Integer getMinimumQueueableDelayInMinutes() { return 0; }

    /**
     * Determine if maximum stack depth is set for your queueable requests.
     */
    global static Boolean hasMaxStackDepth() { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}