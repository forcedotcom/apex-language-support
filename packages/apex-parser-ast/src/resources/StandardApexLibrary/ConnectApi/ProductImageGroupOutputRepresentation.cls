/**
 * Details about a product image group.
 */
global class ProductImageGroupOutputRepresentation {

  /**
   * List of product images in the group.
   */
  global List < ConnectApi.ProductImageOutputRepresentation > images;

  /**
   * The type of product images in the group.
   */
  global String viewType;

}