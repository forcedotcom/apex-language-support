/**
 * Request related to a location’s fulfillment order capacity.
 */
global class CapacityRequestInputRepresentation {

  /**
   * Unique string that identifies the request. Can be a UUID. Use the action request IDs in response data to identify which requests succeeded or failed.
   */
  global String actionRequestId;

  /**
   * ID of the location associated with the request.
   */
  global String locationId;

}