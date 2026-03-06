/**
 * Payment group.
 */
global class PaymentGroupResponse {

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