/**
 * All the promotions associated with the cart.
 */
global class CartPromotionCollection {

  /**
   * ID of the cart.
   */
  global String cartId;

  /**
   * Status of the cart. Values are: Active— Cart is created and available for modifications, like adding or removing products or promotions. Checkout— Cart is in checkout. If the customer modifies the cart, the current checkout session is canceled. Closed— Checkout is complete and an order was created. The cart cannot be modified. PendingClosed— Cart is marked to be closed, but the request isn't completed yet. The cart can’t be modified. This value is available in API version 57.0 and later. PendingDelete— Cart is marked for delete, but the request isn't completed yet. The cart can’t be modified. Processing— Cart is processing. For example, taxes are being calculated. The cart can’t be modified.
   */
  global ConnectApi.CartStatus cartStatus;

  /**
   * Currency ISO code of the cart.
   */
  global String currencyIsoCode;

  /**
   * Collection of promotions.
   */
  global List < ConnectApi.CartPromotionList > promotions;

}