/**
 * A set of inventory locations that together can fulfill an order.
 */
global class TargetLocationInputRepresentation {

  global TargetLocationInputRepresentation() {}

  /**
   * A list of locations with information about their country and postal codes.
   */
  global List < ConnectApi.LocationInputRepresentation > locations;

  global Object clone() {}

}