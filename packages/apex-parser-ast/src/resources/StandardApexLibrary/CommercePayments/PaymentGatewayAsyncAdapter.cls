/**
 * Implement the interface to allow customers to process payments asynchronously.
 * <p>Usage
 * Implementing an asynchronous adapter also requires the processNotification method from the GatewayNotificationResponse class.
 * <p>Example
 * global with sharing class SampleAsyncAdapter
 *         implements commercepayments.PaymentGatewayAsyncAdapter,
 *         commercepayments.PaymentGatewayAdapter {
 *
 *         global SampleAsyncAdapter() {
 *         }
 *
 *         global commercepayments.GatewayResponse processRequest(
 *         commercepayments.paymentGatewayContext gatewayContext) {
 *         }
 *
 *         global commercepayments.GatewayNotificationResponse processNotification(
 *         commercepayments.PaymentGatewayNotificationContext gatewayNotificationContext) {
 *         }
 *         }
 */
global interface PaymentGatewayAsyncAdapter {
    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    /**
     * Entry point for processing notifications from payment gateways.
     * @return When the payment gateway sends a notification to the payments platform, the platform responds with a GatewayNotificationResponse indicating whether the platform succeeded or failed at receiving the notification.
     */
    abstract commercepayments.GatewayNotificationResponse processNotification(commercepayments.PaymentGatewayNotificationContext gatewayNotificationContext);

    virtual String toString();
}