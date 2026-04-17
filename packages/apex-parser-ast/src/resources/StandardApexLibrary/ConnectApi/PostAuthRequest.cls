/**
 * Payment post authorization input consumed by the payment post authorization service.
 */
global class PostAuthRequest extends ConnectApi.BaseRequest {

  /**
   * ID of the account of the customer for the authorized payment.
   */
  global String accountId;

  /**
   * Amount of the post authorization.
   */
  global Double amount;

  /**
   * Comments for payment post authorization. Maximum of 1000 characters.
   */
  global String comments;

  /**
   * Three-letter ISO 4217 currency code associated with the payment group record.
   */
  global String currencyIsoCode;

  /**
   * Date that the payment post authorization occurs.
   */
  global Datetime effectiveDate;

  /**
   * Payment gateway that evaluates the post authorization.
   */
  global String paymentGatewayId;

  /**
   * Payment group associated with or to be created for the request. Request must contain either a paymentGroupId or paymentGroup, but not both.
   */
  global ConnectApi.PaymentGroupRequest paymentGroup;

  /**
   * Payment method sent for the post authorization.
   */
  global ConnectApi.PostAuthApiPaymentMethodRequest paymentMethod;

}