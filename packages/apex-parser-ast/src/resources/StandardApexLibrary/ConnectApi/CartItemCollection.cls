/**
 * A collection of items in a cart.
 */
global class CartItemCollection {

  global CartItemCollection() {}

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

  global Object clone() {}

  global List<String> getApproachingDiscounts() {}

  global ConnectApi.CartCouponCollection getCartCoupons() {}

  global List<ConnectApi.CartItemResult> getCartItems() {}

  global ConnectApi.CartPromotionCollection getCartPromotions() {}

  global ConnectApi.CartSummary getCartSummary() {}

  global String getCheckoutUrl() {}

  global Integer getCount() {}

  global Integer getCurrentPage() {}

  global String getCurrentPageToken() {}

  global String getCurrentPageUrl() {}

  global Boolean getHasErrors() {}

  global String getNextPageToken() {}

  global String getNextPageUrl() {}

  global String getPreviousPageToken() {}

  global String getPreviousPageUrl() {}

  global Integer getTotal() {}

  global Integer getTotalNumberOfPages() {}

  global void setApproachingDiscounts(List<String> value) {}

  global void setCartCoupons(ConnectApi.CartCouponCollection value) {}

  global void setCartItems(List<ConnectApi.CartItemResult> value) {}

  global void setCartPromotions(ConnectApi.CartPromotionCollection value) {}

  global void setCartSummary(ConnectApi.CartSummary value) {}

  global void setCheckoutUrl(String value) {}

  global void setCount(Integer value) {}

  global void setCurrentPage(Integer value) {}

  global void setCurrentPageToken(String value) {}

  global void setCurrentPageUrl(String value) {}

  global void setHasErrors(Boolean value) {}

  global void setNextPageToken(String value) {}

  global void setNextPageUrl(String value) {}

  global void setPreviousPageToken(String value) {}

  global void setPreviousPageUrl(String value) {}

  global void setTotal(Integer value) {}

  global void setTotalNumberOfPages(Integer value) {}

}