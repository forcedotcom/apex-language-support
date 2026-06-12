/**
 * Representation of the response for creating a cart from a quote.
 */
global class CartFromQuoteOutput {

  global CartFromQuoteOutput() {}

  /**
   * ID of the cart created from the quote.
   */
  global String cartId;

  /**
   * Detailed error message if the create cart from a quote operation was unsuccessful.
   */
  global List < ConnectApi.QuoteError > errors;

  global Object clone() {}

}