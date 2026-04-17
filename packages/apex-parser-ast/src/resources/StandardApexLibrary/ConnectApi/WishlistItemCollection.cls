/**
 * Collection of wishlist items.
 */
global class WishlistItemCollection {

  /**
   * Three-letter ISO 4217 currency code associated with the product.
   */
  global String currencyIsoCode;

  /**
   * Token identifying the current page.
   */
  global String currentPageToken;

  /**
   * Connect REST API URL identifying the current page.
   */
  global String currentPageUrl;

  /**
   * Specifies whether at least one of the results contains an error ( true ) or not ( false ).
   */
  global Boolean hasErrors;

  /**
   * Collection of wishlist items.
   */
  global List < ConnectApi.WishlistItem > items;

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

}