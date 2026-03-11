/**
 * Sends information about a payment method to a gateway adapter during a postauthorization service call.
 */
global class PostAuthApiPaymentMethodRequest {

  global PostAuthApiPaymentMethodRequest(commercepayments.CardPaymentMethodRequest cardPaymentMethodRequest) {}

  global commercepayments.CardPaymentMethodRequest cardPaymentMethod;

  global commercepayments.AlternativePaymentMethodRequest PaymentMethod;

}