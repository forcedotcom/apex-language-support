/**
 * Payment gateway authorization response representation.
 */
global class AuthorizationGatewayResponse extends ConnectApi.AbstractGatewayResponse {

  global AuthorizationGatewayResponse() {}

  /**
   * Gateway authorization code.
   */
  global String gatewayAuthorizationCode;

  global Object clone() {}

}