/**
 * Representation of the response for creating a quote from a cart.
 */
global class CreateQuoteFromCartOutput {

  global CreateQuoteFromCartOutput() {}

  /**
   * Detailed error message if the create quote from a cart operation was unsuccessful.
   */
  global List < ConnectApi.QuoteError > errors;

  /**
   * ID of the quote created from the cart.
   */
  global String quoteId;

  global Object clone() {}

}