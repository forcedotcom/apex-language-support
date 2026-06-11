/**
 * A list of promotions for a cart.
 */
global class CartPromotionList {

  global CartPromotionList() {}

  /**
   * Promotions associated with a cart.
   */
  global List < ConnectApi.CartPromotionOutputRepresentation > promotions;

  global Object clone() {}

}