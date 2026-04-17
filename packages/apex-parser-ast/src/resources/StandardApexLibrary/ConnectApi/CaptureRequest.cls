/**
 * Payment capture input consumed by the payment capture service.
 */
global class CaptureRequest extends ConnectApi.BaseRequest {

  /**
   * ID of the account linked to the capture request.
   */
  global String accountId;

  /**
   * Amount captured from the previous authorization.
   */
  global Double amount;

  /**
   * Context for payment APIs. Used for a payment caller to re-establish context.
   */
  global String clientContext;

  /**
   * Comments for the payment capture.
   */
  global String comments;

  /**
   * Date when the payment becomes effective.
   */
  global Datetime effectiveDate;

  /**
   * Indicates whether the current capture payment transaction is the final request ( true ) or not ( false ). Default value is false , but it also depends on the card type associated with the payment authorization.
   */
  global Boolean isFinalCapture;

  /**
   * Details about the payment group record associated with the payment request.
   */
  global ConnectApi.PaymentGroupRequest paymentGroup;

}