/**
 * Represents a payment transaction.
 */
global with sharing class PaymentTransaction {
    @InvocableVariable
    global Long createdTimestamp;
    @InvocableVariable
    global RichMessaging.PaymentError error;
    @InvocableVariable
    global String orderId;
    /**
     * The list of refunds associated with the transaction.
     * List<RichMessaging.Refund>
     */
    @InvocableVariable
    global List refunds;
    @InvocableVariable
    global String statusRaw;
    /**
     * The unique identifier of the transaction.
     * String
     */
    @InvocableVariable
    global String transactionId;
    @InvocableVariable
    global Long updatedTimestamp;

    global PaymentTransaction() { }

    global PaymentTransaction(String orderId, String transactionId, String statusRaw, Long createdTimestamp, Long updatedTimestamp, RichMessaging.PaymentError error, List refunds) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}