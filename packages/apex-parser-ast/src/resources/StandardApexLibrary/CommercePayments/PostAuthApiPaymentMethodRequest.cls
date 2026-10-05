/**
 * Sends information about a payment method to a gateway adapter during a postauthorization service call.
 * <p>Usage
 * Contains information about the payment method that is used for a postauthorization request. It contains all available payment methods as fields, but populates only one field for each request. The gateway adapter uses this class when constructing a postauthorization request. An object of this class is available through the paymentMethod field on the PostAuthorizationRequest Class object.
 */
global with sharing class PostAuthApiPaymentMethodRequest extends commercepayments.BaseApiPaymentMethodRequest {
    global commercepayments.AddressRequest address { get; set; }
    /**
     * The alternative payment method object used in a postauthorizaiton payment method request.
     * <p>commercepayments.alternativePaymentMethodRequest
     */
    global commercepayments.AlternativePaymentMethodRequest alternativePaymentMethod { get; set; }
    /**
     * The card payment method object used in a postauthorizaiton payment method request.
     * <p>commercepayments.CardPaymentMethodRequest
     */
    global commercepayments.CardPaymentMethodRequest cardPaymentMethod { get; set; }
    global String id { get; set; }
    global commercepayments.PaymentMethodIdType idType { get; set; }
    global Boolean saveForFuture { get; set; }

    /**
     * Constructor for PostAuthApiPaymentMethodRequest.
     */
    global PostAuthApiPaymentMethodRequest() { }

    global PostAuthApiPaymentMethodRequest(commercepayments.AlternativePaymentMethodRequest paymentMethodRequest) { }

    /**
     * Constructs a sample cardPaymentMethodRequest. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global PostAuthApiPaymentMethodRequest(commercepayments.CardPaymentMethodRequest paymentMethodRequest) { }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}