/**
 * This class contains the details about the payment method.
 * Example
 * commercepayments.AlternativePaymentMethodResponse alternativePaymentMethodResponse = new commercepayments.AlternativePaymentMethodResponse();
 * alternativePaymentMethodResponse.setEmail('alternativePaymentMethod');
 * alternativePaymentMethodResponse.setEmail('foo@foo.com');
 * alternativePaymentMethodResponse.setGatewayToken('NMoPoIOnTZSaRaWcV7gUUXe');
 * alternativePaymentMethodResponse.setGatewayTokenDetails('gateway token details');
 * commercepayments.PaymentMethodDetailsResponse response = new commercepayments.PaymentMethodDetailsResponse();
 * response.setAlternativePaymentMethod(alternativePaymentMethodResponse);
 */
global with sharing class PaymentMethodDetailsResponse {
    global PaymentMethodDetailsResponse() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the alternative payment method details.
     */
    global void setAlternativePaymentMethod(commercepayments.AlternativePaymentMethodResponse alternativePaymentMethod) { }

    /**
     * Sets the details about the card payment method.
     */
    global void setCardPaymentMethod(commercepayments.CardPaymentMethodResponse cardPaymentMethod) { }

    global override virtual String toString() { return null; }
}