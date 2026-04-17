/**
 * Details about the payment method.
 */
global class PaymentMethodDetails {

  /**
   * Alternative Payment Method details.
   */
  global ConnectApi.AlternativePaymentMethodOutput alternativePaymentMethod;

  /**
   * Card Payment Method details.
   */
  global ConnectApi.CardPaymentMethodOutput cardPaymentMethod;

}