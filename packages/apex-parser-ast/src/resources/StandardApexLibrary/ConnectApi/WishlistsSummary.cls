/**
 * List of wishlist summaries and the displayed list for the context user.
 */
global class WishlistsSummary {

  /**
   * Oldest wishlist displayed for the context user.
   */
  global ConnectApi.Wishlist displayedList;

  /**
   * Summary of wishlists belonging to the context user.
   */
  global List < ConnectApi.WishlistSummary > summaries;

  /**
   * Total number of wishlists belonging to the context user.
   */
  global Integer wishlistCount;

}