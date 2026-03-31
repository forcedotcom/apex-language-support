/**
 * Response to a request to release held fulfillment order capacity at one or more locations.
 */
global class ReleaseHeldFOCapacityResponseOutputRepresentation {

  /**
   * List of responses to the requests to release held fulfillment order capacity at individual locations.
   */
  global List < ConnectApi.CapacityResponseOutputRepresentation > capacityResponses;

}