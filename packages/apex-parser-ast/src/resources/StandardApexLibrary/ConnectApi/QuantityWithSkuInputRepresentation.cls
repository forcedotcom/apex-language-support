/**
 * A quantity of a product.
 */
global class QuantityWithSkuInputRepresentation {

  global QuantityWithSkuInputRepresentation() {}

  /**
   * Quantity of the product.
   */
  global Double quantity;

  /**
   * SKU of the product.
   */
  global String stockKeepingUnit;

  global Object clone() {}

}