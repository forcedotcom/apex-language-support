/**
 * Gateway response following a post authorization request.
 */
global class PostAuthorizationResponse {

  /**
   * Information about errors that occurred in the payment gateway while evaluating the post authorization request.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Payment gateway's response to the post authorization request.
   */
  global ConnectApi.PostAuthGatewayResponse gatewayResponse;

  /**
   * Payment gateway's response to the original payment authorization request.
   */
  global ConnectApi.PaymentAuthorizationResponse paymentAuthorization;

  /**
   * Stores information exchanged between the Salesforce payments platform and external payment gateways. Gateway logs can also record payloads from external payment entities.
   */
  global List < ConnectApi.GatewayLogResponse > paymentGatewayLogs;

  /**
   * Payment group, consisting of one or more payments, sent to the gateway for the post authorization request.
   */
  global ConnectApi.PaymentGroupResponse paymentGroup;

  /**
   * Payment method used in the post authorization request.
   */
  global ConnectApi.PaymentMethodResponse paymentMethod;

  /**
   * Saved payment method status. Valid values are: AlreadyExists Created Updated
   */
  global ConnectApi.PostAuthSPMStatus savedPaymentMethodStatus;

}