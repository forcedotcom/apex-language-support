/**
 * Represents a refund for a payment transaction.
 */
global with sharing class Refund {
    @InvocableVariable
    global Long createdTimestamp;
    @InvocableVariable
    global RichMessaging.CurrencyAmount currencyAmount;
    @InvocableVariable
    global String id;
    @InvocableVariable
    global String speedProcessedRaw;
    @InvocableVariable
    global String statusRaw;
    @InvocableVariable
    global Long updatedTimestamp;

    global Refund() { }

    global Refund(String id, RichMessaging.CurrencyAmount currencyAmount, String speedProcessedRaw, String statusRaw, Long createdTimestamp, Long updatedTimestamp) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}