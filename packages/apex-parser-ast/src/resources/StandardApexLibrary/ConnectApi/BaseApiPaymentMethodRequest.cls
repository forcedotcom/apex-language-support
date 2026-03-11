/**
 * Payment method API input representation.
 */
global class BaseApiPaymentMethodRequest {

  /**
   * Payment method address.
   */
  global ConnectApi.AddressRequest address;

  /**
   * Payment method record ID. Used in payment transactions.
   */
  global String id;

  /**
   * Shows whether Salesforce saves the payment method for future use.
   */
  global Boolean saveForFuture;

}