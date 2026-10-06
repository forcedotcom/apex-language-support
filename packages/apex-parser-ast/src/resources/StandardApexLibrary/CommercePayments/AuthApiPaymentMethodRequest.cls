/**
 * Sends information about a payment method to a gateway adapter during an authorization service call.
 * Usage
 * Contains information about the payment method that is used for an authorization request. It contains all available payment methods as fields, but populates only one field for each request. The gateway adapter uses this class when constructing an authorization request. An object of this class is available through the paymentMethod field on the AuthorizationRequest Class object.
 */
global with sharing class AuthApiPaymentMethodRequest extends commercepayments.BaseApiPaymentMethodRequest {
    global commercepayments.AddressRequest address { get; set; }
    /**
     * The card payment method object used in a payment method request.
     * commercepayments.CardPaymentMethodRequest
     */
    global commercepayments.CardPaymentMethodRequest cardPaymentMethod { get; set; }
    global String id { get; set; }
    global commercepayments.PaymentMethodIdType idType { get; set; }
    global Boolean saveForFuture { get; set; }

    /**
     * Constructor for AuthApiPaymentMethodRequest.
     */
    global AuthApiPaymentMethodRequest() { }

    /**
     * Constructs a sample cardPaymentMethodRequest. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global AuthApiPaymentMethodRequest(commercepayments.CardPaymentMethodRequest cardPaymentMethodRequest) { }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}