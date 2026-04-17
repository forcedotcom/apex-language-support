/**
 * A set of inventory locations that together can fulfill an order.
 */
global class TargetLocationInputRepresentation {

  /**
   * A list of locations with information about their country and postal codes.
   */
  global List < ConnectApi.LocationInputRepresentation > locations;

}