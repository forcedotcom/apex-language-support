/**
 * Wishlist, including summary and items.
 */
global class Wishlist {

  global Wishlist() {}

  /**
   * Page of wishlist items.
   */
  global ConnectApi.WishlistItemCollection page;

  /**
   * Summary of the wishlist.
   */
  global ConnectApi.WishlistSummary summary;

  global Object clone() {}

}