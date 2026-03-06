/**
 * Represents a preserved cart.
 */
global class PreserveCart {

  /**
   * ID of the authenticated cart.
   */
  global String cartId;

  /**
   * Currency ISO code for the authenticated cart.
   */
  global String currencyIsoCode;

  /**
   * List of products that weren’t successfully transferred from the guest cart to the authenticated cart.
   */
  global List < ConnectApi.CartItemBasicResult > failedCartItems;

  /**
   * Total number of products in the guest cart.
   */
  global Integer numberOfProducts;

  /**
   * Total number of products that weren’t successfully transferred from the guest cart to the authenticated cart.
   */
  global Integer numberOfProductsWithError;

  /**
   * Total number of products successfully transferred from the guest cart to the authenticated cart.
   */
  global Integer numberOfProductsWithSuccess;

  /**
   * List of products successfully transferred from the guest cart to the authenticated cart.
   */
  global List < ConnectApi.CartItemBasicResult > succeededCartItems;

}