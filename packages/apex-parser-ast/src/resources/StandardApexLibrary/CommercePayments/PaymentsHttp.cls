/**
 * Makes an HTTP request to start the interaction with the payment gateway.
 * Usage
 * You must specify the CommercePayments namespace when creating an instance of this class. The constructor of this class takes no arguments. For example:
 * CommercePayments.PaymentsHttp payhttp = new CommercePayments.PaymentsHttp();
 */
global with sharing class PaymentsHttp {
    /**
     * Initiates an HTTP request and response.
     */
    global PaymentsHttp() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global void setExcludeResponseLogging(Boolean excludeResponseLogging) { }

    global override virtual String toString() { return null; }
}