/**
 * Represents a request to process a payment status update.
 */
global with sharing class ProcessPaymentStatusRequest {
    @InvocableVariable
    global String channelAddressIdentifier;
    @InvocableVariable
    global String contextRecordId;
    @InvocableVariable
    global RichMessaging.CurrencyAmount currencyAmount;
    @InvocableVariable
    global String platformKey;
    @InvocableVariable
    global String referenceId;
    @InvocableVariable
    global RichMessaging.PaymentStatus status;
    @InvocableVariable
    global List transactions;

    global Object ProcessPaymentStatusRequest() { return null; }

    global Object ProcessPaymentStatusRequest(String channelAddressIdentifier, String platformKey, String contextRecordId, String referenceId, RichMessaging.PaymentStatus status, RichMessaging.CurrencyAmount currencyAmount, List transactions) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}