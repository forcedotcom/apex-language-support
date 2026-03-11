/**
 * Payment method request for sale.
 */
global class SaleApiPaymentMethodRequest extends ConnectApi.BaseApiPaymentMethodRequest {

  /**
   * Payment method used in a sale request.
   */
  global ConnectApi.CardPaymentMethodRequest cardPaymentMethod;

}