/**
 * Product found by a product search.
 */
global class ProductSearchProductOutputRepresentation {

  /**
   * Description of the product.
   */
  global String description;

  /**
   * Image of the product.
   */
  global ConnectApi.ProductSearchImageOutputRepresentation image;

  /**
   * Name of the product.
   */
  global String name;

  /**
   * Class of the product.
   */
  global String productClass;

  /**
   * Stock Keeping Unit (SKU) of the product.
   */
  global String stockKeepingUnit;

  /**
   * Variation attribute set of the product.
   */
  global List < ConnectApi.ProductVariationAttributeOutputRepresentation > variationAttributeSet;

}