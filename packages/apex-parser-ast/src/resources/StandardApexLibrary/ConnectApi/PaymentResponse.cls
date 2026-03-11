/**
 * Payment output.
 */
global class PaymentResponse {

  /**
   * ID of the account related the payment record.
   */
  global String accountId;

  /**
   * Total amount of the payment transaction performed in the payment request.
   */
  global Double amount;

  /**
   * Three-letter ISO 4217 currency code associated with the payment output.
   */
  global String currencyIsoCode;

  /**
   * Date that the payment becomes effective.
   */
  global Datetime effectiveDate;

  /**
   * ID of the payment record.
   */
  global String id;

  /**
   * Number of the payment record created as a result of the request processing.
   */
  global String paymentNumber;

  /**
   * Date when the payment transaction occurred.
   */
  global Datetime requestDate;

  /**
   * Status of the new payment record. Can be DRAFT, PROCESSED or CANCELLED.
   */
  global String status;

}