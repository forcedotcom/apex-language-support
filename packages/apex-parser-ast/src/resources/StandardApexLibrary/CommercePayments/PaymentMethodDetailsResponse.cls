/**
 * This class contains the details about the payment method.
 */
global class PaymentMethodDetailsResponse {

  global PaymentMethodDetailsResponse() {}

  public void setAlternativePaymentMethod(commercepayments.AlternativePaymentMethodResponse alternativePaymentMethod) {}

  public void setCardPaymentMethod(commercepayments.CardPaymentMethodResponse cardPaymentMethod) {}

  global Object clone() {}

}