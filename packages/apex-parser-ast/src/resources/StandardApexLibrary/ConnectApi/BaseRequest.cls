/**
 * Base parameters for making a request to the payment gateway.
 */
global class BaseRequest extends ConnectApi.AuditParamsRequest {

  global BaseRequest() {}

  /**
   * An optional map of additional parameters to be sent to the payment gateway.
   */
  global Map < String , String > additionalData;

  /**
   * Idempotency key.
   */
  global String idempotencyKey;

  global Object clone() {}

}