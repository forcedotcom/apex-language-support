/**
 * Representation of product variation attributes.
 */
global class ProductVariationAttributesRepresentation {

  global ProductVariationAttributesRepresentation() {}

  /**
   * API name of the product attribute.
   */
  global String apiName;

  /**
   * Display label of the product attribute.
   */
  global String label;

  /**
   * Sequence of the attribute in the attribute set.
   */
  global Integer sequence;

  /**
   * Display value of the product attribute.
   */
  global String value;

  global Object clone() {}

}