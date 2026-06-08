/**
 * A product to route, including its SKU and requested quantity.
 */
global class RoutingProductInputRepresentation {

  global RoutingProductInputRepresentation() {}

  /**
   * The quantity of the requested product. Enter a value greater than 0.
   */
  global Double quantity;

  /**
   * The product's stock keeping unit (SKU).
   */
  global String stockKeepingUnit;

  global Object clone() {}

}