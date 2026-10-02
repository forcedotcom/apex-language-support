/**
 * Interface used to process payment requests.
 */
global interface ProcessPaymentHandler {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Processes a payment request.
     */
    abstract RichMessaging.ProcessPaymentResult processPaymentRequest(RichMessaging.ProcessPaymentRequest paymentRequest);

    virtual String toString();
}