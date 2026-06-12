/**
 * Composite product variations input.
 */
global class CompositeCommerceVariationInputRepresentation {

  global CompositeCommerceVariationInputRepresentation() {}

  /**
   * ID of the variation parent product.
   */
  global String parentProductId;

  /**
   * List of variation products and their attributes.
   */
  global List < ConnectApi.ProductVariationInputRepresentation > variations;

  global Object clone() {}

}