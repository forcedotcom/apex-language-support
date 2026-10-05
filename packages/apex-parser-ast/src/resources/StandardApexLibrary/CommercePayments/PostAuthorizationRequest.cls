/**
 * Sends information about a postauthorization request to a gateway adapter during a service call.
 * <p>Usage
 * This class extends <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexref.meta/apexref/apex_class_commercepayments_BaseRequest.htm" target="_blank">BaseRequest</a> and contains information about a transaction postauthorization request. The gateway adapter reads fields from this class to validate the client-side transaction with the payment gateway. An object of this class is available by calling getPaymentRequest() in the PaymentGatewayContext Class).
 * <p>((commercepayments.PostAuthorizationRequest)gatewayContext.getPaymentRequest());
 */
global with sharing class PostAuthorizationRequest extends commercepayments.BaseRequest {
    /**
     * The customer account that is settled when the postauthorization is performed.
     * <p>String
     */
    global String accountId { get; set; }
    @AuraEnabled
    global Map additionalData { get; set; }
    /**
     * The total amount of the postauthorization request.
     * <p>Double
     */
    global Double amount { get; set; }
    /**
     * Comments about the postauthorization. Users can enter comments to provide additional information.
     * <p>String
     */
    global String comments { get; set; }
    /**
     * The ISO currency code for the postauthorization request.
     * <p>String
     */
    global String currencyIsoCode { get; set; }
    global Boolean duplicate { get; set; }
    global String email { get; set; }
    global String idempotencyKey { get; set; }
    global String ipAddress { get; set; }
    global String macAddress { get; set; }
    /**
     * The payment method used to process the postauthorization request.
     * <p>AuthApiPaymentMethodRequest
     */
    global commercepayments.PostAuthApiPaymentMethodRequest paymentMethod { get; set; }
    global String phone { get; set; }

    /**
     * Constructor for building the amount in a postauthorization request. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global PostAuthorizationRequest(Double amount) { }

    global override virtual Boolean equals(Object obj) { return false; }

    global override virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}