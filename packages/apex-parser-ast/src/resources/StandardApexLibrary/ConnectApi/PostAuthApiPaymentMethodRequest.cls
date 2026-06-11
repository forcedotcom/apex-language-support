/**
 * Payment method input for post authorization.
 */
global class PostAuthApiPaymentMethodRequest extends ConnectApi.BaseApiPaymentMethodRequest {

  global PostAuthApiPaymentMethodRequest() {}

  /**
   * Alternative payment method.
   */
  global ConnectApi.AlternativePaymentMethod alternativePaymentMethod;

  /**
   * Card payment method.
   */
  global ConnectApi.CardPaymentMethodRequest cardPaymentMethod;

  global Object clone() {}

}