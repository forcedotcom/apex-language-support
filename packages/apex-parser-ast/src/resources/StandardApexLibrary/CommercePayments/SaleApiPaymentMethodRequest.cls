/**
 * Sends data related to a card payment method to a gateway adapter during a sale service call.
 * Usage
 * This class holds information about a payment method that was used for a Sale request. SaleApiPaymentMethodRequest contains all the possible payment methods as fields, but only one value is populated for a given request. Gateway adapters use this class when constructing a sale request. The object of this class is obtained through the paymentMethod field on the SaleRequest object.
 */
global class SaleApiPaymentMethodRequest extends commercepayments.BaseApiPaymentMethodRequest {
    global commercepayments.AddressRequest address { get; set; }
    /**
     * Contains details of the card used in a payment method.
     * CardPaymentMethodRequest
     */
    @AuraEnabled
    global commercepayments.CardPaymentMethodRequest cardPaymentMethod { get; set; }
    global String id { get; set; }
    global commercepayments.PaymentMethodIdType idType { get; set; }
    global Boolean saveForFuture { get; set; }
    /**
     * Contains details of the standard entry class code used in a payment method.
     * commercepayments.StandardEntryClassCode
     */
    @AuraEnabled
    global commercepayments.StandardEntryClassCode standardEntryClassCode { get; set; }

    /**
     * Constructor for building a sale payment method request. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global SaleApiPaymentMethodRequest() { }

    /**
     * Sends data related to a card payment method to a gateway adapter during a sale service call.
     */
    global SaleApiPaymentMethodRequest(commercepayments.CardPaymentMethodRequest cardPaymentMethodRequest) { }

    /**
     * Maintains the integrity of lists of type SaleApiPaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type SaleApiPaymentMethodRequest by determining the uniqueness of the external object records in a list.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}