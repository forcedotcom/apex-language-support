/**
 * Data used to calculate order fulfillment routes involving the fewest number of shipment splits.
 */
global class FindRoutesWithFewestSplitsInputRepresentation {

  /**
   * Each list element represents the available quantity of a product at an inventory location.
   */
  global List < ConnectApi.LocationAvailabilityInputRepresentation > locationAvailableInventory;

  /**
   * The maximum allowable number of shipment splits. Routing options that involve more than this number of splits are not returned. Note Each split represents an additional shipment. Specifying a maximum of 0 returns only locations that can fulfill the entire order in a single shipment. A maximum of 1 returns combinations of locations that can fulfill the order in one or two shipments, and so on.
   */
  global Integer maximumNumberOfSplits;

  /**
   * Each list element represents a quantity of a product to be routed for fulfillment.
   */
  global List < ConnectApi.QuantityWithSkuInputRepresentation > orderedQuantities;

}