/**
 * Information required to preview a cart to exchange order.
 */
global class PreviewCartToExchangeOrderInputRepresentation {

  /**
   * ID of the cart used for adding items to the exchange order.
   */
  global String exchangeCartId;

  /**
   * Order summary ID.
   */
  global String orderSummaryId;

  /**
   * Return order ID.
   */
  global String referenceId;

  /**
   * The type of the reservation.
   */
  global String reservationType;

}