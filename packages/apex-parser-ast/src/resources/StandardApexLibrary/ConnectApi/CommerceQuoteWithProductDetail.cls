/**
 * Representation for Quote basic details
 */
global class CommerceQuoteWithProductDetail {

  global CommerceQuoteWithProductDetail() {}

  /**
   * Record field containing the quote record details.
   */
  global Map < String , ConnectApi.RecordFieldRepresentation > fields;

  /**
   * ID of the quote.
   */
  global String id;

  /**
   * Buyer's product summary details for the line item.
   */
  global List < ConnectApi.BuyerProductSummary > products;

  /**
   * Quote reference number of the quote.
   */
  global String quoteNumber;

  /**
   * Status of the quote.
   */
  global String status;

  global Object clone() {}

}