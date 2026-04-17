/**
 * Response to a request related to a location’s fulfillment capacity.
 */
global class CapacityResponseOutputRepresentation {

  /**
   * Unique string that identifies the original capacity request.
   */
  global String actionRequestId;

  /**
   * Error returned by the request, if any.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * Indicates whether the request was successful.
   */
  global Boolean success;

}