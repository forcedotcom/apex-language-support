/**
 * When a payment gateway sends a notification for a refund transaction, the payment gateway adapter creates the ReferencedRefundNotification object to store information about notification.
 * <p>Usage
 * This class is used with asynchronous payments. When a payment gateway sends a notification for a refund transcation, the gateway adapter creates an object of type ReferencedRefundNotification to populate the respective values.
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.ReferencedRefundNotification rrn = new CommercePayments.ReferencedRefundNotification();
 * <p>Example
 * commercepayments.NotificationStatus notificationStatus = null;
 *         if (success) {
 *             notificationStatus = commercepayments.NotificationStatus.Success;
 *         } else {
 *             notificationStatus = commercepayments.NotificationStatus.Failed;
 *         }
 *         commercepayments.BaseNotification notification = null;
 *         if ('CAPTURE'.equals(eventCode)) {
 *             notification = new commercepayments.CaptureNotification();
 *         } else if ('REFUND'.equals(eventCode)) {
 *             notification = new commercepayments.ReferencedRefundNotification();
 *         }
 */
global with sharing class ReferencedRefundNotification extends commercepayments.BaseNotification {
    global Object ReferencedRefundNotification() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the transaction amount. Can be positive, negative, or zero.
     */
    global override void setAmount(Double amount) { }

    /**
     * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that communication for the refund notification occurred with the payment gateway.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets information or messages that the gateway returned.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Sets the payment gateway’s reference details.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets the payment gateway’s reference number.
     */
    global override void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets the payment gateway’s result code.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets the payment gateway’s result code description.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets the ID of a notification sent by the payment gateway.
     */
    global void setId(String id) { }

    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets Salesforce result code information.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    /**
     * Sets the notification status value on the notification object.
     */
    global void setStatus(commercepayments.NotificationStatus status) { }

    global override virtual String toString() { return null; }
}