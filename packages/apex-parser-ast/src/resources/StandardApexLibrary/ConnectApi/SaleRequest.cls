/**
 * Payment sale input consumed by the payment sale service.
 */
global class SaleRequest {

  /**
   * Reference to account.
   */
  global String accountId;

  /**
   * The amount of the sale request.
   */
  global Double amount;

  /**
   * Optional comment for the sale request.
   */
  global String comments;

  /**
   * Three-letter ISO 4217 currency code associated with the payment output.
   */
  global String currencyIsoCode;

  /**
   * Date that the sale request takes effect.
   */
  global Datetime effectiveDate;

  /**
   * Indicates whether the sale request is submitted by the merchant ( true ) or not ( false ). Default value is false ,
   */
  global Boolean submittedByMerchant;

  /**
   * The payment gateway that receives the sale request.
   */
  global String paymentGatewayId;

  /**
   * Payment group information for the sale request.
   */
  global ConnectApi.PaymentGroupRequest paymentGroup;

  /**
   * Payment method used within the sale request.
   */
  global ConnectApi.SaleApiPaymentMethodRequest paymentMethod;

}