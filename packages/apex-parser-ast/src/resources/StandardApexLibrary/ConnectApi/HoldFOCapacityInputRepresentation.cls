/**
 * Request to hold fulfillment order capacity at one or more locations. Can correspond to one action call.
 */
global class HoldFOCapacityInputRepresentation {

  global HoldFOCapacityInputRepresentation() {}

  /**
   * List of requests to hold fulfillment order capacity at one or more locations.
   */
  global List < ConnectApi.HoldFOCapacityRequestInputRepresentation > holdFOCapacityRequests;

  global Object clone() {}

}