/**
 * Create a wishlist.
 */
global class WishlistInput {

  global WishlistInput() {}

  /**
   * Name of the wishlist.
   */
  global String name;

  /**
   * List of products to add to the wishlist.
   */
  global List < ConnectApi.WishlistItemInput > products;

  global Object clone() {}

}