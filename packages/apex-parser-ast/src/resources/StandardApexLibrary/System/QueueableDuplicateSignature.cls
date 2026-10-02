/**
 * Used in the AsyncOptions class to store the queueable job signature in the DuplicateSignature property.
 */
global class QueueableDuplicateSignature {
    global static System.QueueableDuplicateSignature.Builder builder() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns the duplicate signature as a string value.
     */
    global override String toString() { return null; }

    /**
     * Build a unique signature for your queueable job using this inner builder class. The build() class method builds a QueueableDuplicateSignature object, with input from the addId(), addInteger(), and addString() methods. Use the DuplicateSignature property in the AsyncOptions class to store the queueable job signature. Enqueue your job by using the System.enqueueJob() with the AsyncOptions parameter.
     * <p>Examples
     * This example builds the async job signature with UserId and the string MyQueueable.
     * AsyncOptions options = new AsyncOptions();
     * options.DuplicateSignature = new System.QueueableDuplicateSignature.Builder()
     *                                 .addId(UserInfo.getUserId())
     *                                 .addString('MyQueueable')
     *                                 .build();
     * try {
     *     System.enqueueJob(new MyQueueable(), options);
     * } catch (DuplicateMessageException ex) {
     *     //Exception is thrown if there is already an enqueued job with the same signature
     *     Assert.areEqual('Attempt to enqueue job with duplicate queueable signature',
     *         ex.getMessage());
     * }
     * This example builds the async job signature using ApexClass Id and the hash value of an sObject.
     * AsyncOptions options = new AsyncOptions();
     * options.DuplicateSignature = new QueueableDuplicateSignature.Builder()
     *                                 .addInteger(System.hashCode(someAccount))
     *                                 .addId([SELECT Id FROM ApexClass
     *                                      WHERE Name='MyQueueable'].Id)
     *                                 .build();
     * System.enqueueJob(new MyQueueable(), options);
     */
    global class Builder {
        global Object Builder() { return null; }

        /**
         * Adds an ID to build a unique signature for a queueable job. You can then enqueue the job by using the signature as the AsyncOptions parameter to System.enqueueJob().
         */
        global System.QueueableDuplicateSignature.Builder addId(Id id) { return null; }

        /**
         * Adds an integer to build a unique signature for a queueable job. You can then enqueue the job by using the signature as the AsyncOptions parameter to System.enqueueJob().
         */
        global System.QueueableDuplicateSignature.Builder addInteger(Integer i) { return null; }

        /**
         * Adds a string to build a unique signature for a queueable job. You can then enqueue the job by using the signature as the AsyncOptions parameter to System.enqueueJob().
         */
        global System.QueueableDuplicateSignature.Builder addString(String s) { return null; }

        /**
         * Builds a unique signature for a queueable job. You can then enqueue the job by using the signature as the AsyncOptions parameter to System.enqueueJob().
         */
        global System.QueueableDuplicateSignature build() { return null; }

        global System.QueueableDuplicateSignature.Builder clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        /**
         * Gets the maximum size of the queueable job signature in bytes.
         */
        global Integer getMaxSize() { return 0; }

        /**
         * Gets the remaining size of the queueable job signature in bytes, after subtracting what is already used by the signature from the maximum allowed number.
         */
        global Integer getRemainingSize() { return 0; }

        /**
         * Gets the size of the queueable job signature in bytes.
         */
        global Integer getSize() { return 0; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}