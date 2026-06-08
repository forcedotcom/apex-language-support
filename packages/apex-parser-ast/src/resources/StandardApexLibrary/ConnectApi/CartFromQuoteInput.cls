/**
 * Input representation for creating a cart from a quote.
 */
global class CartFromQuoteInput {

  global CartFromQuoteInput() {}

  /**
   * Operation type for creating a cart from a quote. Valid values: CONVERT_TO_CART —Create a cart from a quote only when its status is Approved or Accepted . When the user completes checkout by converting the quote to a cart, the method sets the QuoteId field on the Order object using the quote ID. DUPLICATE_TO_CART —Duplicate the quote to a cart.
   */
  global String operationType;

  global Object clone() {}

}