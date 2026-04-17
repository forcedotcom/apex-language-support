/**
 * A quantity of a product and a location group or location assigned to fulfill it.
 */
global class FindRoutesWithFewestSplitsUsingOCIItemInputRepresentation {

  /**
   * The External Reference of the location group or location assigned to the order item. If you specify a location group, inventory is considered for all locations belonging to that group.
   */
  global String locationGroupIdentifier;

  /**
   * Quantity of the product.
   */
  global Double quantity;

  /**
   * SKU of the product.
   */
  global String stockKeepingUnit;

}