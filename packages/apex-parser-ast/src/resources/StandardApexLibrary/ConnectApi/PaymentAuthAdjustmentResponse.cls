/**
 * Authorization Adjustment output representation.
 */
global class PaymentAuthAdjustmentResponse {

  /**
   * ID of the account containing the payment authorization being adjusted.
   */
  global String accountId;

  /**
   * Amount of the payment authorization adjustment.
   */
  global Double amount;

  /**
   * Three-letter ISO 4217 currency code associated with the payment authorization adjustment.
   */
  global String currencyIsoCode;

  /**
   * Date when the authorization adjustment becomes effective.
   */
  global Datetime effectiveDate;

  /**
   * ID of the PaymentAuthAdjustment record.
   */
  global String id;

  /**
   * System-defined reference number.
   */
  global String paymentAuthAdjustmentNumber;

  /**
   * Date when the authorization adjustment transaction occurred.
   */
  global Datetime requestDate;

  /**
   * Status of the payment authorization adjustment.Possible values are: Canceled : The payment authorization reversal has been canceled. The parent authorization has returned to its pre-reversal balance. Draft : The payment authorization reversal can be edited before applying it against the parent authorization. Processed : The payment authorization reversal has been finalized. Users can change the status as follows: Draft to Processed Processed to Canceled Draft to Canceled
   */
  global String status;

}