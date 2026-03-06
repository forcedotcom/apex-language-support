/**
 * Gateway log output.
 */
global class GatewayLogResponse {

  /**
   * Date when the gateway log was created.
   */
  global Datetime createdDate;

  /**
   * Result codes that show the status of a transaction as it is passed to the financial institution and then returned to the client.
   */
  global String gatewayResultCode;

  /**
   * ID of the gateway log record.
   */
  global String id;

  /**
   * Gateway interaction status. It can be SUCCESS, FAILED, or TIMEOUT.
   */
  global String interactionStatus;

}