/**
 * Item in a wishlist.
 */
global class WishlistItem {

  /**
   * Three-letter ISO 4217 currency code associated with the product.
   */
  global String currencyIsoCode;

  /**
   * Error information.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * List price of the wishlist item.
   */
  global Double listPrice;

  /**
   * Product summary for the wishlist item.
   */
  global ConnectApi.CartItemProduct productSummary;

  /**
   * Sales price of the wishlist item.
   */
  global Double salesPrice;

  /**
   * ID of the wishlist item.
   */
  global String wishlistItemId;

}