/**
 * Payment gateway response fields used in sale, authorization, and capture services.
 */
global class AbstractGatewayResponse extends ConnectApi.AbstractGatewayCommonResponse {

  /**
   * Provides information about the gateway communication.
   */
  global String gatewayReferenceDetails;

  /**
   * Unique transaction ID created by the payment gateway.
   */
  global String gatewayReferenceNumber;

}