/**
 * The class contains information about the alternative payment method that are required for a gateway to process the request.
 * <p>Example
 * commercepayments.PostAuthApiPaymentMethodRequest apiPaymentMethod =(commercepayments.PostAuthApiPaymentMethodRequest) postAuthRequest.paymentMethod;
 * commercepayments.AlternativePaymentMethodRequest alternativePaymentMethod= (commercepayments.AlternativePaymentMethodRequest) apiPaymentMethod.alternativePaymentMethod;
 * String gatewayToken = (String)alternativePaymentMethod.gatewayToken;
 * String gatewayTokenDetails = (String)alternativePaymentMethod.gatewayTokenDetails;
 * String name = (String)alternativePaymentMethod.name;
 * String accountId = (String)alternativePaymentMethod.accountId;
 * String email = (String)alternativePaymentMethod.email;
 */
global with sharing class AlternativePaymentMethodRequest extends commercepayments.BasePaymentMethodRequest {
    /**
     * Salesforce account ID to which this payment method is linked.
     * <p>String
     */
    global String accountId { get; set; }
    /**
     * Email address of the card holder.
     * <p>String
     */
    global String email { get; set; }
    /**
     * A unique, alphanumeric ID, that a payment gateway generates when it first processes a payment.
     * <p>The token replaces the actual payment data so that the data is kept secure. This token is stored as encrypted text, and can be used for recurring payments.
     * <p>String
     */
    global String gatewayToken { get; set; }
    /**
     * Information about the gateway token.
     * <p>String
     */
    global String gatewayTokenDetails { get; set; }
    /**
     * Name that you assign to the PaymentMethod object.
     * <p>String
     */
    global String name { get; set; }

    /**
     * Creates a new instance of the CommercePayments.AlternativePaymentMethodRequest class.
     */
    global AlternativePaymentMethodRequest(String gatewayToken) { }

    /**
     * Maintains the integrity of lists of type AlternativePaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type AlternativePaymentMethodRequest by determining the uniqueness of the external object records in a list.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}