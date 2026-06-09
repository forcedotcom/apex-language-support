/**
 * This class contains the details about the payment method.
 */
global class PaymentMethodDetailsResponse {

  global PaymentMethodDetailsResponse() {}

  global void setAlternativePaymentMethod(commercepayments.AlternativePaymentMethodResponse alternativePaymentMethod) {}

  global void setCardPaymentMethod(commercepayments.CardPaymentMethodResponse cardPaymentMethod) {}

  global Object clone() {}

}