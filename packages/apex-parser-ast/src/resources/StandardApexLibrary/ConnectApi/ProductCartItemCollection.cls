/**
 * Items in the cart, grouped by product type.
 */
global class ProductCartItemCollection {

  /**
   * Number of cart items returned on the current page
   */
  global Integer count;

  /**
   * Current page of cart items. The value matches the requested page number, unless the requested page number exceeds the total number of pages. In this scenario, the current page is the highest available page number.
   */
  global Integer currentPage;

  /**
   * Indicates whether at least one of the results contains an error ( True ) or not ( False ).
   */
  global Boolean hasErrors;

  /**
   * Products in the cart.
   */
  global List < ConnectApi.ProductCartItem > products;

  /**
   * Total number of unique products in the cart.
   */
  global Integer totalItemCount;

  /**
   * Total number of pages for the given page size.
   */
  global Integer totalNumberOfPages;

}