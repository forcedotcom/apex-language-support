/**
 * Response to a request to confirm held fulfillment order capacity at one or more locations.
 */
global class ConfirmHeldFOCapacityResponseOutputRepresentation {

  /**
   * List of responses to the requests to confirm held fulfillment order capacity at individual locations.
   */
  global List < ConnectApi.CapacityResponseOutputRepresentation > capacityResponses;

}