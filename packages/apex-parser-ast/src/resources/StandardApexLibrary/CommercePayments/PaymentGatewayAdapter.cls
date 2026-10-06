/**
 * PaymentGatewayAdapters can implement this interface in order to process requests.
 */
global interface PaymentGatewayAdapter {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * The entry point for processing payment requests. Returns the response from the payment gateway.
     * @return The response from the payment gateway.
     */
    abstract commercepayments.GatewayResponse processRequest(commercepayments.PaymentGatewayContext context);

    virtual String toString();
}