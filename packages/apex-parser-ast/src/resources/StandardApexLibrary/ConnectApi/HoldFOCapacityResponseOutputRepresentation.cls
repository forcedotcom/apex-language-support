/**
 * Response to a request to hold fulfillment order capacity at one or more locations.
 */
global class HoldFOCapacityResponseOutputRepresentation {

  /**
   * List of responses to the requests to hold fulfillment order capacity at individual locations.
   */
  global List < ConnectApi.CapacityResponseOutputRepresentation > capacityResponses;

}