/**
 * Output representation of where the quantities were distributed in orders and any remaining quantity
 */
global class DistributePickedQuantitiesOutputRepresentation {

  /**
   * Orders that have all quantities distributed.
   */
  global List < ConnectApi.OrderQuantitiesOutputRepresentation > fullyDistributedOrdersList;

  /**
   * Orders that have no quantities available after distribution.
   */
  global List < ConnectApi.OrderQuantitiesOutputRepresentation > notDistributedOrdersList;

  /**
   * Orders that have partially distributed quantities after distribution.
   */
  global List < ConnectApi.OrderQuantitiesOutputRepresentation > partiallyDistributedOrdersList;

  /**
   * Quantities remaining after the distribution.
   */
  global List < ConnectApi.ItemQuantityOutputRepresentation > quantitiesRemainingList;

}