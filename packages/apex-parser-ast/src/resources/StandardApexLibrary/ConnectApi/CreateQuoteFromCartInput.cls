/**
 * Input representation for creating a quote from a cart.
 */
global class CreateQuoteFromCartInput {

  global CreateQuoteFromCartInput() {}

  /**
   * Map of standard and custom Quote fields, such as expiration date and buyer email.
   */
  global Map < String , String > additionalFields;

  /**
   * Comments submitted by the buyer when requesting a quote.
   */
  global String comments;

  /**
   * Context defination name provided by the buyer when requesting a quote.
   */
  global String contextDefinitionName;

  /**
   * Indicate whether to delete the cart ( true ) or not ( false ) after the quote is created.
   */
  global Boolean deleteCart;

  global Object clone() {}

}