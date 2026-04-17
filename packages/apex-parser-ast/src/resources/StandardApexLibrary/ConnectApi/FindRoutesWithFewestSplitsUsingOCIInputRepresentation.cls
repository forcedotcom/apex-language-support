/**
 * Data used to calculate order fulfillment routes involving the fewest number of shipment splits, taking into account inventory availability.
 */
global class FindRoutesWithFewestSplitsUsingOCIInputRepresentation {

  /**
   * Each list element represents a routing request for one order.
   */
  global List < ConnectApi.FindRoutesWithFewestSplitsGroupUsingOCIInputRepresentation > findRoutesWithFewestSplitsUsingOCIInputs;

}