/**
 * Input representation of a single element within the Distribute To Orders list.
 */
global class DistributeToOrdersInputRepresentation {

  global DistributeToOrdersInputRepresentation() {}

  /**
   * ID of the external order.
   */
  global String externalOrderId;

  /**
   * List of order item quantities.
   */
  global List < ConnectApi.ItemQuantityInputRepresentation > itemQuantities;

  global Object clone() {}

}