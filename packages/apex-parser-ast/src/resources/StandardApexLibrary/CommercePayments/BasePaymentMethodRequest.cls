/**
 * Abstract class for storing information about payment methods.
 * Usage
 * The BasePaymentMethodRequest class contains fields common to CardPaymentMethodRequest
 * .
 */
global abstract with sharing class BasePaymentMethodRequest {
    /**
     * Maintains the integrity of lists of type BasePaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type BasePaymentMethodRequest by determining the uniqueness of the external object records in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}