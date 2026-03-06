/**
 * Product summary for a cart item.
 */
global class CartItemProduct {

  /**
   * Map of product fields and values.
   */
  global Map < String , String > fields;

  /**
   * Name of the product.
   */
  global String name;

  /**
   * Class of product. Values are: Bundle Set Simple Variation VariationParent
   */
  global ConnectApi.ProductClass productClass;

  /**
   * ID of the product.
   */
  global String productId;

  /**
   * If one exists, purchase quantity rule for the product.
   */
  global ConnectApi.PurchaseQuantityRule purchaseQuantityRule;

  /**
   * SEO-friendly URL name for the product.
   */
  global String productUrlName;

  /**
   * SKU of the product.
   */
  global String sku;

  /**
   * Thumbnail image of the product.
   */
  global ConnectApi.ProductMedia thumbnailImage;

  /**
   * Variation attributes associated with the product.
   */
  global Map < String , ConnectApi.CartProductAttribute > variationAttributes;

}