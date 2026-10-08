/**
 * Represents the result of processing a payment status update.
 */
global with sharing class ProcessPaymentStatusResult {
    @InvocableVariable
    global String errorMessage;
    @InvocableVariable
    global Boolean success;

    global ProcessPaymentStatusResult() { }

    global ProcessPaymentStatusResult(Boolean success) { }

    global ProcessPaymentStatusResult(Boolean success, String errorMessage) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}