/**
 * Contains maximum stack depths for queueable transactions and the minimum queueable delay in minutes. Passed as parameter to the System.enqueueJob() method to define a unique queueable job signature, the maximum stack depth for queueable transactions and the minimum queueable delay in minutes.
 */
global class AsyncOptions {
    /**
     * A unique signature for a Queueable job.
     * <p>QueueableDuplicateSignature Class
     */
    global System.QueueableDuplicateSignature DuplicateSignature { get; set; }
    /**
     * Maximum stack depth for queueable transactions.
     * <p>Integer
     */
    global Integer MaximumQueueableStackDepth { get; set; }
    /**
     * Minimum queueable delay for queueable transactions.
     * <p>Integer
     */
    global Integer MinimumQueueableDelayInMinutes { get; set; }

    global AsyncOptions() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}