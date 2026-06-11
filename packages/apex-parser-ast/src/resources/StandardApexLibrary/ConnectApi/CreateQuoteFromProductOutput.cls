/**
 * Representation of the response for creating a quote from a product.
 */
global class CreateQuoteFromProductOutput {

  global CreateQuoteFromProductOutput() {}

  /**
   * Detailed error message if the create quote from product operation was unsuccessful.
   */
  global List < ConnectApi.QuoteError > errors;

  /**
   * ID of the quote created upon a successful request.
   */
  global String quoteId;

  global Object clone() {}

}