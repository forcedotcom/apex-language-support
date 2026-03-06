/**
 * Response to a request to confirm held fulfillment order capacity at one or more locations. Can correspond to one action call.
 */
global class ReleaseHeldFOCapacityOutputRepresentation {

  /**
   * List of responses to the requests to confirm held fulfillment order capacity at one or more locations.
   */
  global List < ConnectApi.ReleaseHeldFOCapacityResponseOutputRepresentation > releaseHeldFOCapacityResponses;

}