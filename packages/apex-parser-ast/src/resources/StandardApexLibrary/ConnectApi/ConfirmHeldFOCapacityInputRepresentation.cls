/**
 * Request to confirm held fulfillment order capacity at one or more locations. Can correspond to one action call.
 */
global class ConfirmHeldFOCapacityInputRepresentation {

  global ConfirmHeldFOCapacityInputRepresentation() {}

  /**
   * List of requests to confirm held fulfillment order capacity at one or more locations.
   */
  global List < ConnectApi.ConfirmHeldFOCapacityRequestInputRepresentation > confirmHeldFOCapacityRequests;

  global Object clone() {}

}