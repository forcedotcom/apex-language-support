/**
 * Customer details for the tax calculation.
 */
global class TaxCustomerDetailsRequest {

  /**
   * ID of the customer's account.
   */
  global String accountId;

  /**
   * Customer code.
   */
  global String code;

  /**
   * Tax exemption number.
   */
  global String exemptionNo;

  /**
   * Tax exemption reason.
   */
  global String exemptionReason;

}