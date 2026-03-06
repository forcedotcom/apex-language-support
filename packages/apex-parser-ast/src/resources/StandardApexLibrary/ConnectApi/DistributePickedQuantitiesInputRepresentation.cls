/**
 * Input representation to Distribute Picked Quantities
 */
global class DistributePickedQuantitiesInputRepresentation {

  /**
   * List of orders that need quantities distributed.
   */
  global List < ConnectApi.DistributeToOrdersInputRepresentation > distributeToOrders;

  /**
   * Criteria used for distributing picked quantities to orders.
   */
  global String optimizationCriteria;

  /**
   * Quantities for each item picked.
   */
  global List < ConnectApi.ItemQuantityInputRepresentation > quantitiesPickedList;

}