/**
 * Payment authorization output representation.
 */
global class PaymentAuthorizationResponse {

  /**
   * Salesforce account for the payment authorization.
   */
  global String accountId;

  /**
   * Amount that the gateway authorized for the payment transaction.
   */
  global Double amount;

  /**
   * Three-letter ISO 4217 currency code associated with the payment group record.
   */
  global String currencyIsoCode;

  /**
   * Date that the authorization becomes effective.
   */
  global Datetime effectiveDate;

  /**
   * Date that the authorization expires.
   */
  global Datetime expirationDate;

  /**
   * ID of the payment authorization record.
   */
  global String id;

  /**
   * System-defined number for the payment authorization record.
   */
  global String paymentAuthorizationNumber;

  /**
   * Date that the authorization occurred.
   */
  global Datetime requestDate;

  /**
   * Status of the payment authorization as returned by the gateway.
   */
  global String status;

}