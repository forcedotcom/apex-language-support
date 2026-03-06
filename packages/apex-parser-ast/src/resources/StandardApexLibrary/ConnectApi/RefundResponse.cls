/**
 * Refund output.
 */
global class RefundResponse {

  /**
   * ID of the account related to the refund record.
   */
  global String accountId;

  /**
   * Total amount of the refund transaction performed in the payment request.
   */
  global Double amount;

  /**
   * Three-letter ISO 4217 currency code associated with the payment group record.
   */
  global String currencyIsoCode;

  /**
   * Date that the refund becomes effective.
   */
  global Datetime effectiveDate;

  /**
   * ID of the refund record.
   */
  global String id;

  /**
   * Number of the refund record that was created as a result of the request processing.
   */
  global String refundNumber;

  /**
   * Date when the refund occurred.
   */
  global Datetime requestDate;

  /**
   * Indicates the results of processing the refund transaction in the gateway. Can be DRAFT, PROCESSED or CANCELLED.
   */
  global String status;

}