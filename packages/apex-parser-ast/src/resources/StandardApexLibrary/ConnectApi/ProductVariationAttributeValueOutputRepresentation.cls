/**
 * Valid value for a product variation attribute.
 */
global class ProductVariationAttributeValueOutputRepresentation {

  /**
   * API Name of the attribute this value belongs to.
   */
  global String name;

  /**
   * Whether the value defines an orderable product variation.
   */
  global Boolean orderable;

  /**
   * Value of the value.
   */
  global String value;

}