/**
 * Promotions for the items in a cart.
 */
global class CartItemPromotionCollectionOutputRepresentation {

  /**
   * Currency code associated with the cart.
   */
  global String currencyIsoCode;

  /**
   * Collection of promotions.
   */
  global Map < String , ConnectApi.CartPromotionListRepresentation > items;

}