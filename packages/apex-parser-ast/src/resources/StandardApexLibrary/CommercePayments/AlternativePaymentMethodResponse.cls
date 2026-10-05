/**
 * The class contains the response details of the alternative payment method.
 * <p>Example
 * commercepayments.AlternativePaymentMethodResponse response = new commercepayments.AlternativePaymentMethodResponse();
 * response.setEmail('alternativePaymentMethod');
 * response.setEmail('foo@foo.com');
 * response.setGatewayToken('NMoPoIOnTZSaRaWcV7gUUXe');
 * response.setGatewayTokenDetails('gateway token details');
 */
global with sharing class AlternativePaymentMethodResponse {
    global AlternativePaymentMethodResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the ID of the Salesforce payments account to which the payment method is linked.
     */
    global void setAccountId(Id accountId) { }

    /**
     * Sets the notes about the payment method added by users.
     */
    global void setComments(String comments) { }

    /**
     * Sets the email ID of the card holder.
     */
    global void setEmail(String email) { }

    /**
     * Sets the token ID that a payment gateway generates when it first processes a payment.
     */
    global void setGatewayToken(String gatewayToken) { }

    /**
     * Sets the details about the payment gateway token.
     */
    global void setGatewayTokenDetails(String gatewayTokenDetails) { }

    /**
     * Sets the name that is assigned to the PaymentMethod object.
     */
    global void setName(String name) { }

    global override virtual String toString() { return null; }
}