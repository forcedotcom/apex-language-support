/**
 * Payment method input representation for payment authorizations.
 */
global class AuthApiPaymentMethodRequest extends ConnectApi.BaseApiPaymentMethodRequest {

  global AuthApiPaymentMethodRequest() {}

  /**
   * Card payment method information.
   */
  global ConnectApi.CardPaymentMethodRequest cardPaymentMethod;

  global Object clone() {}

}