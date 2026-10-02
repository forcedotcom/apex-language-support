/**
 * Represents the result of processing a payment status update.
 */
global with sharing class ProcessPaymentStatusResult {
    @InvocableVariable
    global String errorMessage;
    @InvocableVariable
    global Boolean success;

    global Object ProcessPaymentStatusResult() { return null; }

    global Object ProcessPaymentStatusResult(Boolean success) { return null; }

    global Object ProcessPaymentStatusResult(Boolean success, String errorMessage) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}