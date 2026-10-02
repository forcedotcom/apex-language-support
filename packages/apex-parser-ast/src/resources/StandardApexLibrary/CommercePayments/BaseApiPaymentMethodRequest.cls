/**
 * Abstract class used to send information about a payment method to a gateway adapter during a service call.
 * <p>Usage
 * BaseApiPaymentMethodRequest is the base class for SaleApiPaymentMethodRequest and AuthApiPaymentMethodRequest.
 */
global abstract with sharing class BaseApiPaymentMethodRequest {
    /**
     * The payment method’s address.
     * <p>AddressRequest
     */
    global commercepayments.AddressRequest address { get; set; }
    /**
     * ID of the payment method request.
     * <p>String
     */
    global String id { get; set; }
    /**
     * ID of the payment method type.
     * <p>commercepayments.PaymentMethodIdType
     */
    global commercepayments.PaymentMethodIdType idType { get; set; }
    /**
     * Indicates whether the payment method is saved as a record in Salesforce for future use.
     * <p>Boolean
     */
    global Boolean saveForFuture { get; set; }

    /**
     * Constructs a payment method. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global Object BaseApiPaymentMethodRequest(commercepayments.AddressRequest address, String id, Boolean saveForFuture) { return null; }

    /**
     * Maintains the integrity of lists of type BaseApiPaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type BaseApiPaymentMethodRequest by determining the uniqueness of the external object records in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}