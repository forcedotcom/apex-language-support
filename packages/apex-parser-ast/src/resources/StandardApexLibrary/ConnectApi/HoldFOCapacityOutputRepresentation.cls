/**
 * Response to a request to hold fulfillment order capacity at one or more locations. Can correspond to one action call.
 */
global class HoldFOCapacityOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * List of responses to the requests to hold fulfillment order capacity at one or more locations.
   */
  global List < ConnectApi.HoldFOCapacityResponseOutputRepresentation > holdFOCapacityResponses;

}