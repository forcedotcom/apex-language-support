/**
 * Payment gateway authorization response representation.
 */
global class AuthorizationGatewayResponse extends ConnectApi.AbstractGatewayResponse {

  /**
   * Gateway authorization code.
   */
  global String gatewayAuthorizationCode;

}