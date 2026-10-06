/**
 * Contains the result of the payment platform’s attempt to record data from the gateway’s notification.
 * Usage
 * This class is used with asynchronous payments. It is the return type of the NotificiationClient.record operation and contains the result of the payment platform’s attempt to save notification details.
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.NotificationSaveResult nsr = new CommercePayments.NotificationSaveResult();
 * Example
 * commercepayments.NotificationSaveResult saveResult = commercepayments.NotificationClient.record(notification);
 */
global with sharing class NotificationSaveResult {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Gets the error message, if any, from the payment platform regarding its attempt to save the notification sent from the payment gateway.
     */
    global String getErrorMessage() { return null; }

    /**
     * Gets the status code from the payment platform’s attempt to save the notification sent from the payment gateway.
     */
    global Integer getStatusCode() { return 0; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Gets the status of whether the payment platform successfully saved the notification sent from the payment gateway.
     */
    global Boolean isSuccess() { return false; }

    global override virtual String toString() { return null; }
}