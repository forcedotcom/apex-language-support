/**
 * Payment method request for sale.
 */
global class SaleApiPaymentMethodRequest extends ConnectApi.BaseApiPaymentMethodRequest {

  global SaleApiPaymentMethodRequest() {}

  /**
   * Payment method used in a sale request.
   */
  global ConnectApi.CardPaymentMethodRequest cardPaymentMethod;

  global Object clone() {}

}