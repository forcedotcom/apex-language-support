/**
 * Request to release held fulfillment order capacity at one or more locations. Can correspond to one action call.
 */
global class ReleaseHeldFOCapacityInputRepresentation {

  global ReleaseHeldFOCapacityInputRepresentation() {}

  /**
   * List of requests to release held fulfillment order capacity at one or more locations.
   */
  global List < ConnectApi.ReleaseHeldFOCapacityRequestInputRepresentation > releaseHeldFOCapacityRequests;

  global Object clone() {}

}