/**
 * Input representation for creating a quote from a product.
 */
global class CreateQuoteFromProductInput {

  global CreateQuoteFromProductInput() {}

  /**
   * Key-value pairs for quote entity fields, including both standard and custom fields, used to set additional quote properties during creation.
   */
  global Map < String , String > additionalFields;

  /**
   * Buyer-provided comments when requesting a quote, including special requests, bulk pricing inquiries, or additional notes.
   */
  global String comments;

  /**
   * Context definition name for Revenue Cloud (RLM) when requesting a quote.
   */
  global String contextDefinitionName;

  /**
   * Quantity of the product to include in the quote.
   */
  global String quantity;

  global Object clone() {}

}