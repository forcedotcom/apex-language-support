/**
 * When a payment gateway sends a notification for a sale payment, the payment gateway adapter creates the SaleNotification object to store information about notification.
 * Usage
 * SaleNotification is used in asynchronous payment gateway adapters. Specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example: commercePayments.SaleNotification saleNotification = new commercepayments.SaleNotification();
 * Example
 * global commercepayments.GatewayNotificationResponse processNotification(commercepayments.PaymentGatewayNotificationContext gatewayNotificationContext) {
 *     commercepayments.PaymentGatewayNotificationRequest gatewayNotificationRequest = gatewayNotificationContext.getPaymentGatewayNotificationRequest();
 *     Blob request = gatewayNotificationRequest.getRequestBody();
 *     AdyenNotificationRequest notificationRequest = AdyenNotificationRequest.parse(request.toString().replace('currency', 'currencyCode'));
 *     List < AdyenNotificationRequest.NotificationItems > notificationItems = notificationRequest.notificationItems;
 *     AdyenNotificationRequest.NotificationRequestItem notificationRequestItem = notificationItems[0].NotificationRequestItem;
 *
 *     Boolean success = Boolean.valueOf(notificationRequestItem.success);
 *     String pspReference = notificationRequestItem.pspReference;
 *     String eventCode = notificationRequestItem.eventCode;
 *     Double amount = notificationRequestItem.amount.value;
 *     String reason = notificationRequestItem.reason;
 *     Datetime eventDate = notificationRequestItem.eventDate;
 *
 *     commercepayments.NotificationStatus notificationStatus = null;
 *     if (success) {
 *         notificationStatus = commercepayments.NotificationStatus.Success;
 *     } else {
 *         notificationStatus = commercepayments.NotificationStatus.Failed;
 *     }
 *
 *     commercepayments.BaseNotification notification = null;
 *     if ('AUTHORISATION'.equals(eventCode) && amount > 0) {
 *         notification = new commercepayments.SaleNotification();
 *         notification.setGatewayReferenceNumber(pspReference);
 *     } else {
 *         system.debug('handling unknown event : ' + eventCode);
 *         commercepayments.GatewayNotificationResponse unknownEventResponse = new commercepayments.GatewayNotificationResponse();
 *         unknownEventResponse.setStatusCode(200);
 *         unknownEventResponse.setResponseBody(Blob.valueOf('[not allowed]'));
 *         return unknownEventResponse;
 *     }
 *
 *     notification.setStatus(notificationStatus);
 *     notification.setAmount(amount / 100);
 *     notification.setGatewayResultCodeDescription(reason);
 *     notification.setGatewayDate(eventDate);
 *
 *     commercepayments.NotificationSaveResult saveResult = commercepayments.NotificationClient.record(notification);
 *
 *     commercepayments.GatewayNotificationResponse gnr = new commercepayments.GatewayNotificationResponse();
 *     if (saveResult.isSuccess()) {
 *         gnr.setStatusCode(200);
 *     } else {
 *         gnr.setStatusCode(400);
 *     }
 *     gnr.setResponseBody(Blob.valueOf(saveResult.toString()));
 *     return gnr;
 * }
 */
global with sharing class SaleNotification extends commercepayments.BaseNotification {
    global SaleNotification() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the amount for the sale payment.
     */
    global override void setAmount(Double amount) { }

    /**
     * Sets the AVS (address verification system) result code information that the gateway returned. Maximum length of 64 characters.
     */
    global void setGatewayAvsCode(String gatewayAvsCode) { }

    /**
     * Sets the date that the sale occurred. Some gateways don’t send this value.
     */
    global void setGatewayDate(Datetime gatewayDate) { }

    /**
     * Sets error messages that the gateway returned for the sale request. Maximum length of 255 characters.
     */
    global void setGatewayMessage(String gatewayMessage) { }

    /**
     * Sets additional data that you can use for the sale payment. You can use any data that isn’t normalized in financial entities. This field has a maximum length of 1000 characters and can store data as JSON or XML.
     */
    global void setGatewayReferenceDetails(String gatewayReferenceDetails) { }

    /**
     * Sets the unique gateway reference number for the transaction that the gateway returned. Maximum length of 255 characters.
     */
    global override void setGatewayReferenceNumber(String gatewayReferenceNumber) { }

    /**
     * Sets a gateway-specific result code. The code may be mapped to a Salesforce-specific result code. Maximum length of 64 characters.
     */
    global void setGatewayResultCode(String gatewayResultCode) { }

    /**
     * Sets a description of the gateway-specific result code that a payment gateway returned. Maximum length of 1000 characters.
     */
    global void setGatewayResultCodeDescription(String gatewayResultCodeDescription) { }

    /**
     * Sets the ID of a notification sent by the payment gateway.
     */
    global void setId(String id) { }

    /**
     * Sets the retry category returned by the payment gateway for the failed payment.
     */
    global void setRetryCategory(commercepayments.RetryCategory retryCategory) { }

    /**
     * Sets the retry decision.
     */
    global void setRetryDecision(commercepayments.RetryDecision retryDecision) { }

    /**
     * Sets the Salesforce-specific result code information. Payment gateways have many response codes for payment calls. Salesforce uses the result code information to map payment gateway codes to a predefined set of standard Salesforce result codes.
     */
    global void setSalesforceResultCodeInfo(commercepayments.SalesforceResultCodeInfo salesforceResultCodeInfo) { }

    /**
     * Sets the notification status value on the notification object.
     */
    global void setStatus(commercepayments.NotificationStatus status) { }

    global override virtual String toString() { return null; }
}