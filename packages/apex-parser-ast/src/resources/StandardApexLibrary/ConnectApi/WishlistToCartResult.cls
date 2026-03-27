/**
 * Result of adding a wishlist to a cart.
 */
global class WishlistToCartResult {

  /**
   * ID of the cart to which the products were added.
   */
  global String cartId;

  /**
   * Wishlist items that weren’t successfully added to the cart.
   */
  global List < ConnectApi.CartItemResult > failedWishlistToCartItems;

  /**
   * Total number of products that weren’t added to the cart.
   */
  global Integer productsFailedCount;

  /**
   * Total number of products requested to add to the cart.
   */
  global Integer productsRequestedCount;

  /**
   * Total number of products that were successfully added to the cart.
   */
  global Integer productsSucceededCount;

  /**
   * Wishlist items that were successfully added to the cart.
   */
  global List < ConnectApi.CartItemResult > succeededWishlistToCartItems;

}