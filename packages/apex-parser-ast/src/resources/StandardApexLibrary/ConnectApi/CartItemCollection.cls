/**
 * A collection of items in a cart.
 */
global class CartItemCollection {

  /**
   * List of approaching discounts for the cart items.
   */
  global List < String > approachingDiscounts;

  /**
   * Collection of coupons in the cart.
   */
  global ConnectApi.CartCouponCollection cartCoupons;

  /**
   * Collection of cart item results.
   */
  global List < ConnectApi.CartItemResult > cartItems;

  /**
   * Collection of promotions in the cart.
   */
  global ConnectApi.CartPromotionCollection cartPromotions;

  /**
   * Summary of the cart.
   */
  global ConnectApi.CartSummary cartSummary;

  /**
   * Current page of cart items. The value matches the requested page number, unless the requested page number exceeds the total number of pages. In this scenario, the current page is the highest available page number.
   */
  global Integer currentPage;

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Specifies whether at least one of the results contains an error.
   */
  global Boolean hasErrors;

  /**
   * Token identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageToken;

  /**
   * Connect REST API URL identifying the next page, or null if there isn’t a next page.
   */
  global String nextPageUrl;

  /**
   * Token identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageToken;

  /**
   * Connect REST API URL identifying the previous page, or null if there isn’t a previous page.
   */
  global String previousPageUrl;

  /**
   * Total number of unique products in the cart.
   */
  global Integer totalItemCount;

  /**
   * Total number of pages for the given page size.
   */
  global Integer totalNumberOfPages;

}