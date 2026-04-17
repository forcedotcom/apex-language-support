/**
 * Communicate with simple checkout Apex methods to work with data related to B2B Commerce checkout.
 */
global class B2BCheckoutController {

  /**
   * If you implement your own cart-to-order process without invoking the Cart to Order flow core action, you must invoke this method to correctly track your orders for GMV (Gross Merchandise Value) recognition.
   * @param cartId The cartId of a web cart from which an order is created.
   * @param orderId The orderId of the order you created from the cart.
   */
  public static void licenseCompliance(String cartId, String orderId) {}

}