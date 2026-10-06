/**
 * Interface used to process payment status updates.
 */
global interface ProcessPaymentStatusHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Processes a payment status update.
     */
    abstract RichMessaging.ProcessPaymentStatusResult processPaymentStatus(RichMessaging.ProcessPaymentStatusRequest request);

    virtual String toString();
}