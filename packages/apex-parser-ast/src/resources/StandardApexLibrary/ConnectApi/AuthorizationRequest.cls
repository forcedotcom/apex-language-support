/**
 * Payment Authorization input consumed by the Payment Authorization service.
 */
global class AuthorizationRequest extends ConnectApi.BaseRequest {

  /**
   * Salesforce account that contains the payment transaction being authorized.
   */
  global String accountId;

  /**
   * Authorization amount.
   */
  global Double amount;

  /**
   * Optional comments for the payment authorization.
   */
  global String comments;

  /**
   * Three-letter ISO 4217 currency code associated with the payment group record.
   */
  global String currencyIsoCode;

  /**
   * Date that the authorization will be applied to the transaction.
   */
  global Datetime effectiveDate;

  /**
   * Payment gateway that processes the authorization.
   */
  global String paymentGatewayId;

  /**
   * Payment group for the authorization. The payload must reference either a paymentGroup or a paymentGroupId , but not both.
   */
  global ConnectApi.PaymentGroupRequest paymentGroup;

  /**
   * Payment method used in the payment gateway for the authorization transaction.
   */
  global ConnectApi.AuthApiPaymentMethodRequest paymentMethod;

}