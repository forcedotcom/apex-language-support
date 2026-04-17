/**
 * Payment method input representation for payment authorizations.
 */
global class AuthApiPaymentMethodRequest extends ConnectApi.BaseApiPaymentMethodRequest {

  /**
   * Card payment method information.
   */
  global ConnectApi.CardPaymentMethodRequest cardPaymentMethod;

}