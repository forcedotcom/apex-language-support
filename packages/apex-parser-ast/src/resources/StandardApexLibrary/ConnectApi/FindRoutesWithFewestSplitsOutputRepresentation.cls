/**
 * A list of inventory location combinations that can fulfill an order without exceeding the maximum number of shipments.
 */
global class FindRoutesWithFewestSplitsOutputRepresentation {

  /**
   * Each element of the list is a set of inventory locations that together can fulfill the order being routed.
   */
  global List < ConnectApi.AvailableLocationOutputRepresentation > targetLocations;

}