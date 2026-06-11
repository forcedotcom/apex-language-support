/**
 * Variation product input.
 */
global class ProductVariationInputRepresentation {

  global ProductVariationInputRepresentation() {}

  /**
   * Mapping of variation attributes (API name and value) associated with the product.
   */
  global Map < String , String > variationAttributes;

  global Object clone() {}

}