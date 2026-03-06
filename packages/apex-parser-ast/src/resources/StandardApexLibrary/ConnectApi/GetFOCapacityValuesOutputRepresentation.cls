/**
 * Response to a request for fulfillment order capacity values for one or more locations.
 */
global class GetFOCapacityValuesOutputRepresentation {

  /**
   * List of fulfillment order capacity values for one or more locations.
   */
  global List < ConnectApi.LocationCapacityOutputRepresentation > locations;

}