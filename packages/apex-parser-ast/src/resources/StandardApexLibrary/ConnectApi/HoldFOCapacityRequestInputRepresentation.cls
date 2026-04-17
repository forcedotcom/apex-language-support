/**
 * Request to hold fulfillment order capacity at one or more locations.
 */
global class HoldFOCapacityRequestInputRepresentation {

  /**
   * Controls whether a single failed request cancels all other requests in the list ( true ) or whether some requests can succeed if others fail ( false ). The default value is false .
   */
  global Boolean allOrNothing;

  /**
   * List of requests to hold fulfillment order capacity. Each request is for one fulfillment order at one location.
   */
  global List < ConnectApi.CapacityRequestInputRepresentation > capacityRequests;

}