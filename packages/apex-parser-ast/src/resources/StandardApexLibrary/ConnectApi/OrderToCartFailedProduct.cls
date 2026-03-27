/**
 * Product that could not be added to the cart from an order, with error information.
 */
global class OrderToCartFailedProduct {

  /**
   * Error code.
   */
  global String errorCode;

  /**
   * Error message about the cause of the failure.
   */
  global String errorMessage;

  /**
   * ID of the product.
   */
  global String productId;

  /**
   * Name of the product.
   */
  global String productName;

  /**
   * SKU of the product.
   */
  global String productSKU;

}