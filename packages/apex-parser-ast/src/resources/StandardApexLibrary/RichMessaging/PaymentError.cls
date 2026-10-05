/**
 * Represents an error that occurred during a payment transaction.
 */
global with sharing class PaymentError {
    @InvocableVariable
    global RichMessaging.PaymentErrorCode errorCode;
    @InvocableVariable
    global String errorMessage;

    global PaymentError() { }

    global PaymentError(String errorMessage, RichMessaging.PaymentErrorCode errorCode) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}