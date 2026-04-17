/**
 * Output groupings of items in an order
 */
global class OrderQuantitiesOutputRepresentation {

  /**
   * String representation of the grouping of SKUs.
   */
  global String externalOrderId;

  /**
   * List of items and quantities.
   */
  global List < >ConnectApi.ItemQuantityOutputRepresentation > itemQuantities;

}