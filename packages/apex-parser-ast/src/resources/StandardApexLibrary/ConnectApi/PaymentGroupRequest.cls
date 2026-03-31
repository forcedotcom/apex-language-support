/**
 * Payment group input consumed by a payment group service.
 */
global class PaymentGroupRequest {

  /**
   * Specifies whether Salesforce needs to create a payment group ( true ) or not ( false ).
   */
  global Boolean createPaymentGroup;

  /**
   * Three-letter ISO 4217 currency code associated with the payment group record.
   */
  global String currencyIsoCode;

  /**
   * ID of the payment group record.
   */
  global String id;

  /**
   * Source object ID of the payment group record. Supports only OrderId.
   */
  global String sourceObjectId;

}