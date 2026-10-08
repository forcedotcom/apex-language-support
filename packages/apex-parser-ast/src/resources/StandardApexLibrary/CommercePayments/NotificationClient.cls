/**
 * Communicates with the payment platform regarding the gateway’s notification.
 * Usage
 * Specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example:
 * CommercePayments.NotificationClient ntc = new CommercePayments.NotificationClient();
 * This class is used in asynchronous payment gateway adapters. The notification client contains API for communicating with the payments platform regarding the gateway’s notification. When the gateway sends a notification, the gateway adapter invokes the record method in NotificationClient to request that the platform updates notification details.
 * Example
 * The NotificationSaveResult class creates a saveResult object to store the result of the save request made to the payment gateway.
 * commercepayments.NotificationSaveResult saveResult = commercepayments.NotificationClient.record(notification);
 */
global with sharing class NotificationClient {
    global NotificationClient() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Stores the results of a notification request.
     */
    global static commercepayments.NotificationSaveResult record(commercepayments.BaseNotification notification) { return null; }

    global override virtual String toString() { return null; }
}