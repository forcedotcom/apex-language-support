/**
 * Input representation of a single element within the Distribute To Orders list.
 */
global class DistributeToOrdersInputRepresentation {

  /**
   * ID of the external order.
   */
  global String externalOrderId;

  /**
   * List of order item quantities.
   */
  global List < ConnectApi.ItemQuantityInputRepresentation > itemQuantities;

}