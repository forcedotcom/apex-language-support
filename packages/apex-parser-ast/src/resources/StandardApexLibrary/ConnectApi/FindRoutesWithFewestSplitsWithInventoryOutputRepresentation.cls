/**
 * Sets of inventory locations that can combine to fulfill an order, with availability data for those locations.
 */
global class FindRoutesWithFewestSplitsWithInventoryOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * Inventory availability data for the location groups and locations specified in the input.
   */
  global ConnectApi.OCIGetInventoryAvailabilityOutputRepresentation inventory;

  /**
   * Each entry in the list is a set of inventory locations that can combine to fulfill an order.
   */
  global List < ConnectApi.AvailableLocationOutputRepresentation > targetLocations;

}