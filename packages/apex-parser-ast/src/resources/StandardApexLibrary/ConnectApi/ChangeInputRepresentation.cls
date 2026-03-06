/**
 * A list of changes to OrderItemSummaries that make up an order change, such as a cancel or return.
 */
global class ChangeInputRepresentation {

  /**
   * List of changes to OrderItemSummaries.
   */
  global List < ConnectApi.ChangeItemInputRepresentation > changeItems;

}