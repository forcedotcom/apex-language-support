/**
 * Input representation for coupon code redemption.
 */
global class CouponCodeRedemptionInput {

  /**
   * ID of the buyer account or email address for a guest user.
   */
  global String buyer;

  /**
   * List of coupon codes.
   */
  global List < String > couponCodes;

  /**
   * ID of the account.
   */
  global String effectiveAccountId;

  /**
   * ID of the transaction, which must be a valid cart ID.
   */
  global String transactionId;

}