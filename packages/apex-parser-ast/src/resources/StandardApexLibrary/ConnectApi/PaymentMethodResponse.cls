/**
 * Payment method information response.
 */
global class PaymentMethodResponse {

  /**
   * Salesforce Payments account to which this payment method is linked.
   */
  global String accountId;

  /**
   * ID of the payment method.
   */
  global String id;

  /**
   * Details about the payment method.
   */
  global ConnectApi.PaymentMethodDetails paymentMethodDetails;

  /**
   * Status of the payment method.
   */
  global String status;

}