/**
 * Referenced refund input.
 */
global class ReferencedRefundRequest extends ConnectApi.RefundRequest {

  /**
   * ID of the account linked to the referenced refund request.
   */
  global String accountId;

  /**
   * Amount refunded.
   */
  global Double amount;

  /**
   * Context for payment APIs. Used for a payment caller to re-establish context.
   */
  global String clientContext;

  /**
   * Optional comments for the refund.
   */
  global String comments;

  /**
   * Date when the refund becomes effective.
   */
  global Datetime effectiveDate;

  /**
   * Payment group details associated with the refund request.
   */
  global ConnectApi.PaymentGroupRequest paymentGroup;

}