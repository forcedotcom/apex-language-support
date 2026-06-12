/**
 * An OrderItemSummary and quantity.
 */
global class OrderItemSummaryInputRepresentation {

  global OrderItemSummaryInputRepresentation() {}

  /**
   * ID of the OrderItemSummary.
   */
  global String orderItemSummaryId;

  /**
   * Quantity to include. Can't contain a fraction or a decimal.
   */
  global Double quantity;

  global Object clone() {}

}