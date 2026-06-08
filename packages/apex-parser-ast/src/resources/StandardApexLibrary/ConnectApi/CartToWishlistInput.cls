/**
 * Copy products from a cart to a wishlist.
 */
global class CartToWishlistInput {

  global CartToWishlistInput() {}

  /**
   * ID of the wishlist to copy cart products to.
   */
  global String wishlistId;

  global Object clone() {}

}