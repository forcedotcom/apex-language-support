/**
 * Payment Authorization output representation.
 */
global class AuthorizationResponse {

  /**
   * Error representation for the payment authorization.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Gateway response representation for the payment authorization.
   */
  global ConnectApi.AuthorizationGatewayResponse gatewayResponse;

  /**
   * Indicates whether the authorization status from a payment gateway, such as Stripe, supports multiple captures ( true ) or not ( false ).
   */
  global Boolean isMultiCaptureSupported;

  /**
   * Payment authorization representation.
   */
  global ConnectApi.PaymentAuthorizationResponse paymentAuthorization;

  /**
   * Gateway log list representation for the payment authorization.
   */
  global List < ConnectApi.GatewayLogResponse > paymentGatewayLogs;

  /**
   * Payment group representation for the payment authorization.
   */
  global ConnectApi.PaymentGroupResponse paymentGroup;

  /**
   * Payment method representation for the payment authorization.
   */
  global ConnectApi.PaymentMethodResponse paymentMethod;

}