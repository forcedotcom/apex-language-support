/**
 * Wraps the information related to a gateway notification.
 * <p>Usage
 * This class is used with asynchronous payments. It wraps all of the information related to a notification from the payment gateway. The payments platform provides its context to the payment gateway adapters.
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.PaymentGatewayNotificationContext pgnc = new CommercePayments.PaymentGatewayNotificationContext();
 * <p>Example
 * global commercepayments.GatewayNotificationResponse
 * processNotification(commercepayments.PaymentGatewayNotificationContext gatewayNotificationContext) {
 * commercepayments.PaymentGatewayNotificationRequest notificationRequest = gatewayNotificationContext.getPaymentGatewayNotificationRequest();
 * }
 */
global with sharing class PaymentGatewayNotificationContext {
    global Object PaymentGatewayNotificationContext(commercepayments.PaymentGatewayNotificationRequest request) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the payment gateway’s notification request.
     */
    global commercepayments.PaymentGatewayNotificationRequest getPaymentGatewayNotificationRequest() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}