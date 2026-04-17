/**
 * Result of copying products from a cart to a wishlist.
 */
global class CartToWishlistResult {

  /**
   * Number of products copied from the cart to the wishlist.
   */
  global Integer productsAddedCount;

  /**
   * ID of the wishlist that cart products were copied to.
   */
  global String wishlistId;

}