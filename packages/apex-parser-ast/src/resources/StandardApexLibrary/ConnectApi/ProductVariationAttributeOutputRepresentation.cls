/**
 * Details about a product variation attribute.
 */
global class ProductVariationAttributeOutputRepresentation {

  global ProductVariationAttributeOutputRepresentation() {}

  /**
   * API name of the attribute.
   */
  global String apiName;

  /**
   * Label of the attribute.
   */
  global String label;

  /**
   * List of valid values for the variation attribute.
   */
  global List < ConnectApi.ProductVariationAttributeValueOutputRepresentation > variationAttributeValues;

  global Object clone() {}

}