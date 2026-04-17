/**
 * Data used to calculate inventory availability and fulfillment routes for one order involving the fewest number of shipment splits.
 */
global class FindRoutesWithFewestSplitsGroupUsingOCIInputRepresentation {

  /**
   * List of locations to exclude from the routing calculations.
   */
  global List < String > excludeLocations;

  /**
   * Maximum allowable number of shipment splits. Routing options that involve more than this number of splits are not returned. Note Each split represents an additional shipment. Specifying a maximum of 0 returns only locations that can fulfill the entire order in a single shipment. A maximum of 1 returns combinations of locations that can fulfill the order in one or two shipments, and so on.
   */
  global Integer maximumNumberOfSplits;

  /**
   * Each list element represents a quantity of a product to be routed for fulfillment and the assigned location group or location.
   */
  global List < ConnectApi.FindRoutesWithFewestSplitsUsingOCIItemInputRepresentation > orderedItems;

}