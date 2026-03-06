/**
 * Request to confirm held fulfillment order capacity at one or more locations.
 */
global class ConfirmHeldFOCapacityRequestInputRepresentation {

  /**
   * Controls whether a single failed request cancels all other requests in the list ( true ) or whether some requests can succeed if others fail ( false ). The default value is false .
   */
  global Boolean allOrNothing;

  /**
   * List of requests to confirm held fulfillment order capacity. Each request is for one fulfillment order assigned to one location.
   */
  global List < ConnectApi.CapacityRequestInputRepresentation > capacityRequests;

}