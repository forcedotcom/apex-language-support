/**
 * Information required for a submit cart to exchange order action.
 */
global class SubmitCartToExchangeOrderInputRepresentation {

  /**
   * ID of the cart used for adding items to the exchange order.
   */
  global String exchangeCartId;

  /**
   * Order number.
   */
  global String orderNumber;

  /**
   * Order summary ID.
   */
  global String orderSummaryId;

  /**
   * List of payment information when additional funds are needed for the newly created exchange order.
   */
  global List < ConnectApi.PaymentInfoInputRepresentation > paymentInfoList;

  /**
   * Return order ID.
   */
  global String referenceId;

  /**
   * The reservation that's created by the submit API. The possible values are Full, which means there’s a reservation against the exchange cart, or None if there’s no reservation.
   */
  global String reservationType;

  /**
   * Ordered list of order payment summaries and reserved balance amounts to apply them to.
   */
  global List < ConnectApi.sharedOrderPaymentSummarySequenceInputRepresentation > sequences;

}