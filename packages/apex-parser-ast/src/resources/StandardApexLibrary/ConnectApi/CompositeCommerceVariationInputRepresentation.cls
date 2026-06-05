/**
 * Composite product variations input.
 */
global class CompositeCommerceVariationInputRepresentation {

  /**
   * ID of the variation parent product.
   */
  global String parentProductId;

  /**
   * List of variation products and their attributes.
   */
  global List < ConnectApi.ProductVariationInputRepresentation > variations;

}